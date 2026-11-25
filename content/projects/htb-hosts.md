---
title: "htb-hosts"
description: "Sudo-free, cleanable /etc/hosts management for lab work, as a CLI and a zero-dependency MCP server, so people and AI agents edit host entries the same safe way."
techStack: ["Python", "MCP", "Linux", "POSIX ACLs"]
links: {"github": "https://github.com/sresarehumantoo/htb-hosts"}
featured: false
status: published
completedAt: 2026-07-11
featuredImage: /images/covers/htb-hosts.png
---
Lab work means constantly adding `IP → hostname` lines to `/etc/hosts` and then hunting them down later. htb-hosts keeps every entry it manages inside one delimited block, grants write access through a one-time POSIX ACL instead of sudo, and clears a whole box (or everything) with one command.

## Features

- **No sudo for daily use.** A single ACL entry grants write access; the tool edits the file in place under `flock` so a rename never drops that ACL.
- **One-shot cleanup.** Entries are tagged by box name, so `clean --tag box` removes a box and `clean --exclude box` keeps one and clears the rest.
- **Pipe-friendly lookups.** `htb-hosts get box` prints a bare IP for `$(...)`, and an empty match is an error rather than an empty argument list.
- **Strict validation.** IPs, hostnames and tags are validated so no input can inject an extra line, including through IPv6 scope ids.
- **Snapshots and rollback.** Every change is backed up to a private directory, with named snapshots and one-command restore.
- **MCP server included.** The same operations as native tools for Claude Code and other MCP clients, with no third-party dependencies.
