---
title: "Agents Get a Path, Not a Token"
excerpt: "How I stopped handing AI agents admin Vault tokens: a read-only standing identity, a default-deny allow-list of write scopes, and 20-minute tokens that agents only ever see as a file path."
publishedAt: 2026-11-24
categories: ["Security", "AI Agents", "Vault"]
project: vault-scope
featuredImage: /images/covers/agents-get-a-path-not-a-token.png
draft: false
---
AI coding agents now drive as much of my homelab automation as I do. They provision VMs, rotate service credentials, and write the occasional secret into HashiCorp Vault. That last part is where my setup had a hole, and I didn't see how big it was until I wrote it down.

The standing identity on my controller box is a Vault AppRole whose token Vault Agent keeps fresh in a file sink. That token is read-only on purpose. Agents can read the secrets they need to deploy things, and that's it. Of course, "read-only" only holds until something needs to write. When I went looking, five separate tools in my repos carried some variant of the same comment: *this step needs a write, log in as admin first*. In practice that meant an OIDC admin token copied into a file in `/tmp`, used for one `vault kv put`, and then forgotten about until it expired an hour later.

So every write was an escalation, by construction. What I wanted instead:

1. No standing write credential exists anywhere, for agents or for me.
2. Writes are scoped to a specific secret prefix, and anything outside that prefix is unreachable even if the scope is misconfigured.
3. Token material never ends up in an agent's transcript.

What I ended up with is `vault-scope`: about 480 lines of stdlib-only Python, a CLI, and a zero-dependency MCP server so agents can call it as a native tool.

## The Vault feature that makes it work

Vault normally enforces that a child token's policies are a subset of its parent's. A read-only parent can't create a token that writes, which is almost always what you want.

Token roles are the exception. If you create a token *against a role*, the role's `allowed_policies` decides what the child may carry, not the parent's own policy set. So the standing read-only token gets exactly one new capability: the right to call `auth/token/create/<role>` on a fixed family of roles. Each role pins its allowed policies to two things: a write policy for that scope's prefixes, and a shared deny policy. The parent can mint a token that writes without ever being able to write itself.

The roles are generated from a single Terraform map. Trimmed and with names made generic, each one looks like this:

```hcl
resource "vault_token_auth_backend_role" "agent_scope" {
  for_each = local.agent_scopes

  role_name        = "agent-${each.key}"
  allowed_policies = ["scope-${each.key}", "scope-deny"]
  orphan           = true
  renewable        = false
  token_type       = "service"

  # Non-renewable + explicit max means the token simply dies;
  # there is no path to extending it.
  token_explicit_max_ttl = each.value.ttl_seconds
}
```

Some of those settings do more than they look like they do:

- `orphan = true` keeps a minted token alive when Vault Agent re-authenticates and its own token is replaced. Without it, a 20-minute write token could die halfway through a deploy because the parent rotated.
- `renewable = false` plus an explicit max TTL means no API call can extend a scope token. It expires in 20 to 30 minutes.
- The allow-list is default-deny. A scope that isn't in the Terraform map has no role, so it can't be minted, and that map is the one place I look to answer "what can my agents write?"

## The agent gets a path

The part I care most about is what `mint` returns. It writes the token to a `0600` file and hands back the path, never the token:

```python
def mint(scope: str, force: bool = False) -> dict[str, Any]:
    """Mint (or reuse) a scoped token; return metadata, never the token itself.

    The secret is written to a 0600 file and only its PATH is returned, so token
    material never lands in an agent transcript or a shell history line.
    """
    if not force:
        cached = _cached(scope)
        if cached:
            cached["reused"] = True
            return cached
    ...
    # 0600, replaced atomically so a concurrent reader never sees a partial token.
    tmp = meta["token_path"] + ".tmp"
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(auth["client_token"])
    os.replace(tmp, meta["token_path"])
```

From the agent's side, a write looks like this:

```bash
export VAULT_TOKEN=$(cat "$(vault-scope mint myapp --path-only)")
vault kv put kv/myapp/api-key value=...
```

The shell expands the token at execution time, so it never shows up in the model's context window, the tool-call log, or my shell history. The MCP tool is the same: `vault_scope_mint` returns the path and expiry and nothing else.

One small courtesy to the audit log: if a cached token for the same scope has more than two minutes left, `mint` reuses it instead of minting a fresh one, so a burst of ten writes doesn't produce ten tokens. `--force` overrides it.

## Default-deny needs a cheap escape hatch

Default-deny only survives if adding a scope is easier than grabbing an admin token. When an agent hits a scope that doesn't exist, I don't want it improvising. So `vault-scope request <name> --paths <prefix>` prints the exact one-entry change to the Terraform map, the targeted `terraform apply`, and the verification commands. The unknown-scope error tells the agent to run it.

Adding a scope is a reviewed, one-line Terraform change that I apply by hand. It is meant to be cheap, and it is meant to require a human.

## The crown-jewel backstop, and the specificity trap

Every scope token carries the shared deny policy. It lists the paths no scope should ever reach: hypervisor credentials, CI tokens, SSH keys, Terraform state credentials, and Vault's own control plane. It's one file, so protecting a new path is a one-line change.

This is where rollout bit me. I wrote the deny like this:

```hcl
# scope policy
path "kv/data/services/*"   { capabilities = ["create", "update", "read"] }

# deny policy: does NOT win
path "kv/data/+/terraform"  { capabilities = ["deny"] }
```

I expected the explicit `deny` to beat the allow. It didn't. Vault first picks the single highest-priority matching rule for a path, and only then merges capabilities across policies. Priority favors more specific patterns: an exact path segment outranks a `+` wildcard, which outranks a trailing glob. The allow's literal `services` segment outranked the deny's `+`, so a services-scope token could write `kv/data/services/terraform`.

A deny only beats an allow when it's at least as specific. The fix was to spell protected paths out exactly. What I actually kept from this was how to test it. Don't test a deny by attempting the write against a real secret, because `vault kv put` *replaces* rather than merges. Ask Vault instead:

```bash
vault token capabilities "$SCOPE_TOKEN" kv/data/services/terraform   # want: deny
```

That turned into a regression suite. `tests/acl_matrix.py` mints each scope through the normal path and asks `sys/capabilities-self` what that token can do on a list of paths, including crown jewels sitting *inside* a scope's own prefix. It never performs a real read or write, so it's safe to point at production paths. I run it after any change to the allow-list or the deny policy.

## Bugs

The first one was an empty-token trap. During rollout, `VAULT_TOKEN=""` did not mean "no token." The Vault CLI fell back to `~/.vault-token`, which at the time held a copy of the agent identity. That went wrong twice. A test harness whose mint step failed left `VAULT_TOKEN` empty, so every "scope token" assertion actually ran as the read-only parent: denies looked like passes. Worse, a revoke aimed at an empty variable (`vault token revoke -self`) revoked the live agent token, and everything that depended on it broke until I restarted Vault Agent.

The fix had two halves. I retired the home-directory copy entirely, so an empty token now fails loudly with `missing client token`. And `vault-scope` reads only the Vault Agent sink, deliberately never `~/.vault-token`, because `vault login` writes whatever token it obtained there, usually an admin one. Any script that relies on the ambient default can silently run as whoever logged in last.

The second: hardcoded policies made a new scope unmintable. The first version of `mint` requested `[scope-<name>, scope-deny]` explicitly. Then I added a read-only scope for Terraform, which needs exactly the paths the normal deny policy blocks, so it pairs with a different deny policy. Vault rejects a create whose requested policies aren't a subset of the role's `allowed_policies`, so the new scope was unmintable. Now `mint` reads the role and uses its `allowed_policies` as the single source of truth, falling back to the old pair only if the role can't be read.

The third was about restarts. `vault-scope doctor` is the first stop for any 403. A dead sink token is fixed by restarting Vault Agent, but an AppRole lockout is made worse by it, since every restart is another failed login. So `doctor` tells the two apart, and when the credential itself is the problem it says *stop restarting* instead of suggesting one more.

## If you build one

Agents route around friction the same way people do, so the `request` command matters as much as the deny policy. Handing back a file path instead of a secret is now how I do it anywhere an agent touches credentials. If a token leaks into a log anyway, it's dead within half an hour. And `capabilities-self` lets you assert on crown jewels without touching them.

`vault-scope` lives in my private GitLab because it's tightly coupled to my Vault layout, but the pattern is small enough to rebuild in an afternoon: a read-only parent, token roles with pinned `allowed_policies`, a shared deny policy spelled out exactly, and a mint command that hands back a path.
