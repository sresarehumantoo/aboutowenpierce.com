---
title: "htb-hosts"
description: "Sudo-free, cleanable /etc/hosts management for lab work, as a CLI and a zero-dependency MCP server, so people and AI agents edit host entries the same safe way."
techStack: ["Python", "MCP", "Linux", "POSIX ACLs"]
links: {"github": "https://github.com/sresarehumantoo/htb-hosts"}
featured: false
status: maintained
license: MIT
completedAt: 2026-07-11
featuredImage: /images/covers/htb-hosts.png
---
## What it is

htb-hosts manages the `IP → hostname` lines that Hack The Box, CTFs and pentest labs pile into `/etc/hosts`. Every entry it writes lives inside one delimited block, tagged by box name, so a whole box (or everything) comes out with one command. It ships as a CLI and as a zero-dependency MCP server that share one core library, so a coding agent adds a vhost through the same validation I do. It's pure Python standard library with no runtime dependencies.

## Why it exists

Two problems, one small and one not:

- **The file turns into a graveyard.** Each box adds a vhost, then a second one, then a domain controller name, and nobody cleans up. A stale entry can quietly override a name you actually need.
- **Agents need to edit it too.** An agent that finds a vhost has to add it, and the only normal way to edit `/etc/hosts` is root. I wasn't going to give an agent `sudo`, or act as its human `sudo tee -a` relay.

## Install

Requires Linux, Python 3.11 or newer, and a filesystem with POSIX ACL support plus `setfacl`.

```sh
git clone https://github.com/sresarehumantoo/htb-hosts.git
cd htb-hosts
make install
```

The one-time install needs privilege: it copies the tool into place, grants your user an ACL on `/etc/hosts`, installs zsh and bash completions, and registers the MCP server. Daily use needs no `sudo`. `htb-hosts migrate` pulls existing host lines into the managed block.

```console
$ htb-hosts add 192.0.2.10 box.example.htb dc01.box.example.htb
$ nmap -p- $(htb-hosts get box)          # bare IP, made for $(...)
$ htb-hosts get box --host -i 1          # one hostname when a box has several
$ htb-hosts clean --tag box              # done with this box
$ htb-hosts clean --exclude box          # or keep it and clear the rest
$ htb-hosts restore                      # roll back the last change
```

## How it works

Lines outside the markers (localhost, IPv6 defaults, anything added by hand) are never touched:

```
# >>> htb-hosts >>>  (managed by htb-hosts; run `htb-hosts clean` to remove)
192.0.2.10	box.example.htb dc01.box.example.htb  # tag=box added=2026-07-11
# <<< htb-hosts <<<
```

Write access comes from a single ACL entry, `setfacl -m u:you:rw /etc/hosts`. Tags default to the box name derived from the hostname (`dc01.box.example.htb` becomes `box`), which is what makes `clean --tag` and `clean --exclude` work across several IPs. The MCP server exposes the same operations as native tools, including `htb_hosts_select` for bare values and a `dry_run` on clean.

## Key design decisions

- **Edit in place, never rename.** The textbook safe write (temp file, then `rename()` over the original) replaces the inode and drops the ACL. Every write goes through one function that rewrites the file in place under an exclusive `flock`, readers take a shared lock, and a test asserts the inode survives every write.
- **Validation is the security boundary.** Python's `ipaddress` accepts an IPv6 scope id containing a newline or `#`, and echoes it back, so a valid-looking "IP" could inject a second hosts line. Scope ids are now checked against a strict character set.
- **Tab completion treats the file as untrusted.** bash's `compgen -W` runs command substitution on its word list, and zsh's `_call_program` evals its arguments, so a hand-edited `$(...)` in the block could run on Tab. bash now filters by plain string prefix and zsh re-quotes the typed words as literals, so candidates stay data.
- **Empty is an error.** `get` with no match exits non-zero with empty stdout, and an out-of-range `-i` does the same, so a typo can't hand an empty or short target list to the next command.
- **Fuzzy removal asks first.** `clean --match` prints its plan and confirms when it would remove more than one entry; with no terminal to ask, it refuses.
- **Every change is snapshotted** to a private `0700` directory, with named snapshots and one-command restore. A failed snapshot warns loudly rather than blocking the write.

## Status

Stable. The test suite runs against a throwaway file and covers injection rejection, the inode-preserving write, `flock` concurrency, snapshot permissions and tamper refusal, and the full CLI and MCP surfaces. Lint is gated at a 10.00 pylint score.

**The honest caveat:** the ACL is broader than the tool. It lets any process running as your user rewrite the whole file and redirect name resolution system-wide; the managed block is a convention the tool honors, not something the kernel enforces. That's the deliberate trade for sudo-free use, and it belongs on a personal lab machine, not a shared or production host. `make purge` removes the ACL again. Snapshots also outlive `clean`, so delete them by hand if old engagement hostnames matter.
