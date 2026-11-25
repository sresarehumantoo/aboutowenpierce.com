---
title: "reaper"
description: "Open-source triage for obfuscated JavaScript and TypeScript malware: Babel AST deobfuscation, dynamic analysis in a hardened Docker sandbox, IOC extraction, and SARIF output."
techStack: ["TypeScript", "Babel", "Docker", "Malware Analysis"]
links: {"github": "https://github.com/sresarehumantoo/reaper"}
featured: true
status: active
license: MIT
completedAt: 2026-05-14
featuredImage: /images/covers/reaper.png
---
## What it is

reaper is a static and dynamic analyzer for JavaScript and TypeScript. It started as a way to triage the malware that turns up on compromised websites: packed payloads, eval layers, char-code arrays, base64 staging and payloads hosted in smart contracts. It works just as well as a plain dead-code finder on an ordinary source tree. One command takes a suspicious HTML page or script to rewritten plaintext, findings, indicators of compromise and a verdict.

## Why it exists

Web malware is built to defeat reading. A loader injected into a WordPress theme is a base64 data URI wrapping obfuscator.io output, which fetches its next stage from blockchain storage, which is itself XOR-encoded. Each layer is mechanical, but peeling them by hand is slow and running the sample to see what it does is unsafe. reaper does the peeling statically, and only runs sample code inside a locked-down child process or container when it has to.

## Install

Requires Node.js 22.18+ (or 24.11+), or Docker on its own.

```sh
npm install -g @sresarehumantoo/reaper

reaper suspicious.html --triage                       # deobfuscate, findings, IOCs, verdict
reaper suspicious.js --triage --format json --defang --output triage.json
reaper obfuscated.js --rewrite out/                   # write readable .deobf.js files
reaper sample.js --iocs --defang                      # indicators only
reaper "src/**/*.js" --format sarif --output reaper.sarif
```

`--triage` chains HTML extraction, the string-array rewrite, constant folding, obfuscation findings and IOC extraction into one report per input, with a SHA-256, deobfuscation stats and a `clean`, `suspicious` or `malicious` verdict plus the reasons behind it. Exit codes are made for CI: `0` for nothing found, `1` for findings, and `2` when triage marks anything malicious. The README also shows how to run the CLI itself from a Docker image with no network, a read-only filesystem and all capabilities dropped, which is the recommended way to look at an untrusted sample.

## How it works

- **Static analysis on the Babel AST:** unused code, unreachable branches, constant-folded dead branches, call-graph reachability, and obfuscation patterns such as `eval`, `new Function`, `String.fromCharCode`, bracket access to `constructor` and high-entropy strings.
- **Deobfuscation:** an obfuscator.io string-array rewriter that boots the decoder in an isolated child process and substitutes every wrapper call with its plaintext; a fixpoint constant-folding pass for `atob`, `fromCharCode`, string joins and literal arithmetic; XOR-loop decoder recovery; and `p,a,c,k,e,r` unpacking.
- **HTML ingestion:** inline `<script>` blocks and base64 `data:` URIs in a captured page become separate units, since that is how these payloads are usually smuggled.
- **IOC extraction:** URLs, domains, IPs, wallet addresses and EVM selectors, webhooks, keys, LOLBin command lines and more, each with a context hint. Base64 blobs are decoded and re-scanned, and `--defang` makes the output safe to paste into a ticket.
- **Dynamic analysis** in a Docker sandbox: non-root, no network, all capabilities dropped, read-only filesystem, memory and CPU caps and a hard timeout. A monitoring shim logs every `eval`, `require`, `fetch` and file access, and `--observe-network` answers network calls with a stub so you see the request the script would have made without any real egress.

## Case studies

The repository's `examples/` directory holds three reproducible walkthroughs of real samples, each with a step-by-step README and an analysis report. Every step runs against committed, inert files with no network access, and the reports are the place to start.

- **[EtherHiding + ClickFix](https://github.com/sresarehumantoo/reaper/tree/main/examples/etherhiding)** ([report](https://github.com/sresarehumantoo/reaper/blob/main/examples/etherhiding/REPORT.md)). A loader injected into a compromised WordPress site reads each later stage from smart-contract storage on BNB Smart Chain testnet, so there is no JavaScript C2 hostname to block. reaper recovers every JavaScript stage statically, through an operating-system dispatcher to a fake captcha overlay that copies a native command to the victim's clipboard.
- **[ClickFix to XLoader](https://github.com/sresarehumantoo/reaper/tree/main/examples/clickfix-xloader)** ([report](https://github.com/sresarehumantoo/reaper/blob/main/examples/clickfix-xloader/REPORT.md)). The same family with a different chain: the C2 address lives in a Polygon contract, a fake Cloudflare "verify you are human" overlay delivers a PowerShell lure, and nested PowerShell layers end in an XLoader/Formbook infostealer. The final binary is deliberately not committed; only its hashes and metadata are.
- **[PropellerAds smart popunder](https://github.com/sresarehumantoo/reaper/tree/main/examples/propellerads-sfp)** ([report](https://github.com/sresarehumantoo/reaper/blob/main/examples/propellerads-sfp/REPORT.md)). A 97 KB obfuscator.io ad-fraud tag that hijacks clicks and the back button and fingerprints visitors. reaper resolves all 2,355 of its decoder calls, and the sample drove the alias and nested-wrapper support in the rewriter.

The sample files are real, live malware kept as data. Read the reports and walkthroughs; don't run anything under `examples/`. The README describes a sparse checkout that leaves them out.

## Key design decisions

- **One hardened path for running sample code.** The string-array decoder and eval capture run in a child process with frozen intrinsics, a 128 MB heap, a hard timeout and a stripped environment, and everything that executes sample code goes through that single module.
- **Static first, dynamic only when needed.** Most layers are mechanical and can be undone without execution, which is safer and reproducible. The sandbox is for the stages that genuinely need to run.
- **Reproducible case studies.** Each walkthrough commits every intermediate stage with SHA-256 sums, which `make ci` verifies, and its steps diff reaper's current output against the committed plaintext.
- **Machine-readable by default.** JSON and SARIF output and composable exit codes, so it fits in a pipeline or GitHub Code Scanning rather than only in a terminal.

## Status

Actively developed and published on npm, with tagged releases on GitHub.
