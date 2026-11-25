---
title: "Giving an AI Agent /etc/hosts Without Giving It Sudo"
excerpt: "htb-hosts is a small CLI and MCP server that lets me and my coding agents manage lab host entries without sudo. The interesting parts were the ones that looked trivial: an ACL that a rename would silently destroy, an IPv6 scope id that could inject lines, and tab completion that could run code."
publishedAt: 2026-11-24
categories: ["Security", "AI Agents", "Linux"]
featuredImage: /images/covers/giving-an-ai-agent-etc-hosts-without-giving-it-sudo.png
draft: false
---
If you do Hack The Box, CTFs, or internal pentest work, you edit `/etc/hosts` constantly. A target answers on a virtual host, so you add `192.0.2.10 box.example.htb`. Then you find a second vhost, then a domain controller name, then you move on to the next box and forget to clean any of it up. A month later the file is a graveyard of stale lab entries, and one of them is quietly overriding a name you actually need.

That's a mild annoyance. It turned into a real problem once AI coding agents started doing some of my lab work. An agent that finds a vhost needs to add it, and the only way to edit `/etc/hosts` is root. I was not going to give an agent `sudo`, and I didn't want to be the human `sudo tee -a` relay either.

So I wrote [htb-hosts](https://github.com/sresarehumantoo/htb-hosts): a sudo-free, cleanable `/etc/hosts` manager with a CLI for me and a zero-dependency MCP server for agents, both sharing one core library. It's about 1,150 lines of stdlib Python with no runtime dependencies, and most of the work went into problems that looked too small to have any.

## The shape of it

Everything the tool owns lives inside one delimited block. Lines outside the markers (localhost, IPv6 defaults, anything you added by hand) are never touched:

```
# >>> htb-hosts >>>  (managed by htb-hosts; run `htb-hosts clean` to remove)
192.0.2.10	box.example.htb dc01.box.example.htb  # tag=box added=2026-07-11
# <<< htb-hosts <<<
```

Entries are tagged by box name, derived from the hostname, so a whole box can go at once:

```console
$ htb-hosts add 192.0.2.10 box.example.htb dc01.box.example.htb
$ nmap -p- $(htb-hosts get box)        # bare IP, made for $(...)
$ htb-hosts clean --tag box            # done with this one
$ htb-hosts clean --exclude box        # or keep it and clear everything else
```

The agent gets the same operations as MCP tools: `htb_hosts_add`, `htb_hosts_select`, `htb_hosts_clean` with a `dry_run`, backup and restore. The agent and I go through the same code and the same validation, instead of the agent improvising a `sed` against a root-owned file.

## Sudo-free means an ACL, and an ACL means no renames

The privilege model is one POSIX ACL entry, granted once at install time:

```bash
setfacl -m u:youruser:rw /etc/hosts
```

That's the whole trick, and it constrains how the file can be written. The textbook way to update a config file safely is to write a temp file and `rename()` it over the original, so readers never see a half-written file. Here that would be a bug. The rename replaces the inode, and the new inode has whatever owner and permissions the writer gives it. The ACL is gone, ownership flips to my user, and since I'm not the file's owner I couldn't put the ACL back even if I noticed.

So every write in the tool goes through one function that edits in place under an exclusive lock:

```python
def _locked_write(builder):
    try:
        fd = os.open(HOSTS_FILE, os.O_RDWR | os.O_CREAT, 0o644)
    except PermissionError as exc:
        raise HostsError(_permission_hint()) from exc
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        with os.fdopen(fd, "r+", closefd=False, encoding="utf-8") as handle:
            original = handle.read()
            new_text, result = builder(original)
            if new_text != original:
                _backup(original)
                handle.seek(0)
                handle.write(new_text)
                handle.truncate()
                handle.flush()
                os.fsync(handle.fileno())
            return result
    finally:
        os.close(fd)
```

Giving up atomic rename means giving up the guarantee that readers never see a partial file, so readers take a shared `flock` too. The test suite checks that the inode survives every write. The whole no-sudo design rests on that, and it's exactly what a well-meaning refactor would "fix."

The ACL is also broader than the tool, and the README says so. It lets *any* process running as my user rewrite the whole file and redirect name resolution system-wide. The kernel doesn't know about the managed block; only the tool respects it. I'm fine with that on a personal lab machine. I wouldn't be on a shared or production host.

## Validation is the security boundary

The tool writes into a file that controls name resolution, so validation is the boundary. IPs go through `ipaddress`, hostnames through a strict DNS-name regex, tags through a safe-character allow-list. No input, from me or an agent, should produce anything other than exactly one well-formed line.

I still got that wrong once. Python's `ipaddress` module accepts IPv6 addresses with a scope id, like `fe80::1%eth0`, and it accepts any characters at all in the scope id, newlines and `#` included. `str()` then echoes them back verbatim. So an "IP address" could carry a newline and a second hosts entry of the caller's choosing, and it would pass validation because the library said it was a valid address.

The fix was small:

```python
def validate_ip(ip: str) -> str:
    try:
        addr = ipaddress.ip_address(ip.strip())
    except ValueError as exc:
        raise HostsError(f"invalid IP address: {ip!r}") from exc
    # ipaddress accepts any characters in an IPv6 scope id (fe80::1%<anything>),
    # newlines and '#' included, and str() echoes them back into the file.
    scope = getattr(addr, "scope_id", None)
    if scope is not None and not re.match(r"^[A-Za-z0-9_.-]+$", scope):
        raise HostsError(f"invalid IP address: {ip!r}")
    return str(addr)
```

"I validated it with the standard library" tells you what the parser considers valid, which isn't necessarily what I do. When the output goes into a line-oriented file, what I actually need is "contains no line terminators or comment characters," so now I check that directly.

## Tab completion that could run code

The tool ships live zsh and bash completions. `htb-hosts rm <TAB>` offers the hostnames currently in the managed block, `restore <TAB>` offers your snapshots. So completion candidates come from file contents, and a hosts file is not trusted input.

The bash version originally filtered candidates with `compgen -W "$words"`. That looks harmless until you read the man page: `compgen -W` runs shell expansions on its word list, *including command substitution*. The tool itself only writes validated names, but the managed block is plain text that anything with write access can hand-edit, and a word containing `$(...)` that ended up in the candidate list would execute on `<TAB>`.

The zsh version had a related problem from the other direction. `_call_program` evals its arguments, and I was passing the words already typed on the command line through to scope the candidates. A `$(...)` still sitting unexpanded on the line would run when you pressed Tab.

The fixes were boring. The bash function now filters by plain string prefix in a `read` loop instead of `compgen -W`. The zsh function re-quotes the typed words as literals before handing them to `_call_program`. And the core library refuses to emit backup names that don't match a conservative safe-word pattern, so the completion layer never sees anything weird in the first place.

## Smaller fixes

A few more cheap changes from the same pass:

- **Snapshots are private and don't follow symlinks.** Every write takes an automatic snapshot, which means a backup directory full of old lab hostnames. The directory is created `0700` and the tool refuses one it doesn't own. Snapshot files are opened with `O_NOFOLLOW` and explicitly `fchmod`ed to `0600`, since the create mode doesn't apply to a file that already exists. Restore skips anything that isn't a regular file, because restoring a symlink would copy its target into `/etc/hosts`.
- **Destructive fuzzy matches ask first.** `clean --match` removes whatever a fuzzy pattern selects, which is the one removal you can't verify by reading the command line. It prints its plan and asks when it would remove more than one entry. With no terminal to ask, it refuses rather than guessing.
- **Empty results are errors.** `get` exits non-zero with empty stdout when nothing matches, so a typo can't hand an empty target list to the next command in a pipeline.
- **The MCP server answers garbage with errors, not crashes.** A JSON-RPC message that isn't an object, or `arguments` that isn't a dict, now gets a proper `-32600`/`-32602` error. An agent sending a malformed call should get something it can read and correct, not a dead server.
- **`doctor` checks the block's integrity**, not just writability, and prints the exact `setfacl` command if the ACL has been lost.

## Why bother for a hosts file

This came from the same place as my Vault scoping work. When an agent needs a privileged capability, I'd rather not hand it the general-purpose privilege (root, an admin token) and hope it only uses the part it needs. I'd rather write a narrow tool that does one job, validates its input, and is easier for the agent to use than the dangerous option.

That tool is then the security boundary, and it gets reviewed like one. Nearly every real bug I fixed in htb-hosts was in code I'd have called obviously fine: a standard-library parser, a completion helper, an atomic-write idiom. Those are the places I now read twice.

The code, tests and install steps are on [GitHub](https://github.com/sresarehumantoo/htb-hosts).
