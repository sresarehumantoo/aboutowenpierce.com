---
title: "wsmancer"
description: "A PSRP-native WinRM shell in Go for offensive Windows work: typed JSON output, integrity-checked NTLM/Kerberos message sealing against locked-down listeners, and a session that survives dropped connections."
techStack: ["Go", "PSRP", "WinRM", "Kerberos", "NTLM"]
links: {"github": "https://github.com/sresarehumantoo/wsmancer"}
featured: true
status: active
license: LGPL-3.0
completedAt: 2026-08-13
featuredImage: /images/covers/wsmancer.png
demo: {"src": "/images/projects/wsmancer-demo.mp4", "poster": "/images/projects/wsmancer-demo-poster.png", "alt": "Terminal recording: wsmancer authenticates with NTLM and sealing over port 5985, runs whoami and Get-Process, and cancels a long-running command with Ctrl-C."}
---
## What it is

wsmancer is a WinRM shell for penetration testing, red teaming, CTFs and lab work. It speaks the PowerShell Remoting Protocol (PSRP) end to end, so command results come back as typed objects rather than scraped console text, and it authenticates against stock, locked-down listeners. It ships as one static Go binary with no runtime dependencies.

It began as a Go port of [evil-winrm](https://github.com/Hackplayers/evil-winrm) and keeps all 20 of its flags, so existing muscle memory and scripts carry over unchanged.

## Why it exists

evil-winrm wraps commands in WinRS rather than speaking PSRP. That leaves two gaps:

- **Output is text.** A program or an agent driving the shell has to parse a formatted table. wsmancer's `-o json` emits every PowerShell stream (output, error, warning, verbose) as typed JSON.
- **The default listener refuses unsealed requests.** `AllowUnencrypted=false` does not mean "require HTTPS". It means the SOAP body must be sealed with keys from the NTLM or Kerberos handshake, even on plain port 5985. A client that can't seal gets a 401.

## Install

Requires Go 1.26 or newer.

```sh
go install github.com/sresarehumantoo/wsmancer/cmd/wsmancer@latest
```

```sh
# password
wsmancer -i dc01.corp.local -u svc-account -r corp.local -p 'Passw0rd!'

# Kerberos from a ccache or kirbi ticket
wsmancer -i dc01.corp.local -K user.ccache -r CORP.LOCAL

# one-shot, JSON out
wsmancer -i dc01.corp.local -u u -p p -o json -x 'Get-Process | select -First 3'
```

## How it works

WinRM has two independent encryption layers, and they are easy to confuse:

```
┌──────────────────────────────────────────────────┐
│ Layer 2  TLS transport  (HTTPS, 5986, via -S)    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Layer 1  message sealing  (NTLM / Kerberos)  │ │
│ │ SOAP body encrypted with keys from the auth  │ │
│ │ exchange; commands and output live here      │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

Sealing is what makes wsmancer work against hardened targets at all, since most WinRM targets expose only 5985. What sealing doesn't give you is strong server authentication or, for NTLM, strong crypto. That is what TLS adds, and with `-S` the target's certificate is verified by default. Only `--insecure` skips verification, and it prints a warning when it does.

PSRP comes from a fork of [go-psrp](https://github.com/sresarehumantoo/go-psrp) carrying the transport changes wsmancer needs: a pluggable authenticator for the sealing layer, pipeline termination for Ctrl-C, an adaptive receive timeout, and WS-Addressing `RelatesTo` correlation.

## Key design decisions

- **Integrity-checked in both directions, not only encrypted.** An inbound message whose checksum or header doesn't recompute is rejected, and the failure ends the session rather than handing ciphertext to the caller. Mutation testing in CI breaks the NTLM sealing code twenty ways and the Kerberos code fourteen ways, and fails unless every mutant is caught.
- **Replay protection one layer up.** Measuring a real server showed its Kerberos sequence number stays at zero, so freshness can't be enforced in the sealing layer. Every response must instead echo the request's random `MessageID` as `RelatesTo`, and a missing header fails the check.
- **Recover quietly, lose state loudly.** A dropped connection re-dials and re-attaches the same shell. A shell the target has forgotten is reopened with an explicit warning that session state, including loaded scripts, is gone, and the failed command is not re-run.
- **One dispatch path.** The interactive shell, `-x` one-shots and `-x -` batches share it, so every built-in works non-interactively. Batch mode keeps one authenticated connection and streams one JSON object per command.
- **`--proxy` instead of proxychains.** proxychains hooks libc's `connect`, which a static Go binary never calls, so it silently ignores the proxy. wsmancer dials SOCKS5 itself and resolves names at the proxy.
- **History stays in memory by default**, because session commands routinely contain passwords and hashes. `-Y` opts in to a per-target `0600` history file.

## Status

Working: password, pass-the-hash, Kerberos and certificate auth; sealing; TLS verification and mutual TLS; upload and download with SHA-256 checks; JSON and batch output; session logging; SOCKS5 pivoting; and every post-exploitation command upstream evil-winrm v3.9 ships, each verified against a real target. Tested against Windows 11 25H2 with current Defender signatures and Windows Server 2025, and the sealing checks were also verified live against a Windows Server 2016 domain controller in my lab.

**Authorized use only.** Use it against systems you own or have explicit permission to test.

## Credits

Command surface and three PowerShell payloads from evil-winrm (LGPL-3.0, which is why wsmancer is LGPL-3.0 too). PSRP from [smnsjas/go-psrp](https://github.com/smnsjas/go-psrp) and go-psrpcore. The `--accept-fingerprint` pinning model follows [ligolo-ng](https://github.com/nicocha30/ligolo-ng).
