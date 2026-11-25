---
title: "reaper"
description: "Open-source triage for obfuscated JavaScript and TypeScript malware: Babel AST deobfuscation, dynamic analysis in a hardened Docker sandbox, IOC extraction, and SARIF output."
techStack: ["TypeScript", "Babel", "Docker", "Malware Analysis"]
links: {"github": "https://github.com/sresarehumantoo/reaper"}
featured: true
status: published
completedAt: 2026-05-14
featuredImage: /images/covers/reaper.png
---
reaper started as a way to triage JavaScript malware samples (packed payloads, eval layers, char-code arrays, base64 staging, smart-contract-hosted payloads) and works just as well as a plain dead-code finder on ordinary source trees.

## What it does

- **Static analysis on the AST:** unused code, unreachable branches, constant folding, and obfuscation patterns such as `eval`, `new Function`, `String.fromCharCode` and high-entropy strings.
- **Deobfuscation:** an obfuscator.io string-array rewriter, a generic constant-folding pass, XOR-loop decoder recovery, and recursive analysis of eval layers in an isolated child process.
- **IOC extraction:** URLs, domains, IPs, wallet addresses, webhooks, keys, LOLBin command lines and more, with base64 blobs decoded and re-scanned and optional defanging.
- **One-shot triage:** HTML extraction, rewrite, folding, findings and IOCs in a single per-file report with a `clean`/`suspicious`/`malicious` verdict.
- **Dynamic analysis** in a hardened Docker sandbox, with SARIF output for CI.
