---
title: "vault-scope"
description: "Short-lived, path-scoped HashiCorp Vault write tokens minted from a read-only identity, so AI agents can write secrets without any standing write credential, and only ever see a file path."
techStack: ["Python", "HashiCorp Vault", "Terraform", "MCP"]
links: {}
featured: false
status: maintained
privateSource: true
completedAt: 2026-07-31
featuredImage: /images/covers/vault-scope.png
---
## What it is

vault-scope mints short-lived HashiCorp Vault tokens that can write to one scope's secret prefixes and nothing else. The standing identity it mints from is read-only, so no long-lived write credential exists anywhere, for agents or for me. It's about 480 lines of standard-library Python with a CLI and a zero-dependency MCP server, so coding agents call it as a native tool.

The source lives in my private GitLab because it's tightly coupled to my Vault layout. The pattern is small enough to rebuild in an afternoon, and [the post about it](/blog/agents-get-a-path-not-a-token/) walks through it with code.

## Why it exists

AI coding agents drive much of my homelab automation, and they read secrets through a read-only Vault identity kept fresh by Vault Agent. Read-only held until something needed to write. Five separate tools carried a comment that amounted to "log in as admin first", which in practice meant an admin token copied into a file for one write and then left there until it expired. Every write was an escalation by construction.

## Usage

```sh
vault-scope list                      # scopes you may mint
vault-scope mint myapp --path-only    # mint or reuse; prints a 0600 token file path
vault-scope request newapp --paths <prefix>   # the reviewed change that adds a scope
vault-scope doctor                    # first stop for any 403

export VAULT_TOKEN=$(cat "$(vault-scope mint myapp --path-only)")
vault kv put <path> value=...
```

The MCP tools mirror the CLI: list, mint, request and doctor. The mint tool returns the token path and expiry, never the token.

## How it works

Vault normally requires a child token's policies to be a subset of its parent's. Token roles are the exception: a role's `allowed_policies` decides what a token created against it may carry. So the read-only identity gets exactly one extra capability, the right to create tokens against a fixed family of roles, and each role pins its policies to a write policy for that scope plus a shared deny policy. The parent can mint a token that writes without ever being able to write itself.

The roles come from one Terraform map, which is the single answer to "what can my agents write?" Minted tokens are orphans, so they survive Vault Agent re-authenticating, and non-renewable with an explicit maximum TTL, so they die after 20 to 30 minutes with no way to extend them.

## Key design decisions

- **The agent gets a path, not a token.** `mint` writes the token to a `0600` file, replaced atomically, and returns the path. The shell expands it at execution time, so token material never reaches the model's context, the tool-call log or shell history.
- **Default-deny with a cheap escape hatch.** A scope that isn't in the Terraform map can't be minted. `request` prints the exact one-entry change, the targeted apply and the verification steps, because default-deny only survives if adding a scope is easier than grabbing an admin token. Adding one still needs a human.
- **A crown-jewel deny on every token.** A shared deny policy lists paths no scope should ever reach, such as hypervisor and CI credentials and Vault's own control plane. A deny only beats an allow when it is at least as specific, so protected paths are spelled out exactly.
- **Vault is the source of truth.** `mint` reads the role's `allowed_policies` rather than assuming them, and `list` reconciles the local scope descriptions against what Vault will actually mint, flagging drift in either direction.
- **Reuse before minting.** A cached token with more than two minutes left is reused, so a burst of writes doesn't spray tokens into the audit log.
- **`doctor` tells failures apart.** A dead Vault Agent token is fixed by a restart; an AppRole lockout is made worse by one. `doctor` distinguishes them and says to stop restarting when the credential itself is the problem.

## Status

In daily use. Unit tests stub Vault and need no network. A separate ACL matrix mints each scope through the normal path and asks Vault what that token could do on a list of paths, including protected paths inside a scope's own prefix, without performing a single real read or write.
