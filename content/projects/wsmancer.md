---
title: "wsmancer"
description: "A PSRP-native WinRM shell in Go for offensive Windows work: typed JSON output, integrity-checked NTLM/Kerberos message sealing against locked-down listeners, and a session that survives dropped connections."
techStack: ["Go", "PSRP", "WinRM", "Kerberos", "NTLM"]
links: {"github": "https://github.com/sresarehumantoo/wsmancer"}
featured: true
status: published
completedAt: 2026-08-13
---
evil-winrm has been the go-to WinRM shell for years, but it wraps commands in WinRS rather than speaking the PowerShell Remoting Protocol. wsmancer is a rebuild from scratch in Go that speaks PSRP end to end.

## Features

- **Structured output.** Real PSRP objects become typed JSON with every PowerShell stream intact, usable from another program or an agent, not only a human at a prompt.
- **Auth that holds up against a hardened target.** NTLM and Kerberos with WinRM message sealing, pass-the-hash, and certificate auth, so it works against the default `AllowUnencrypted=false` listener that refuses unsealed requests.
- **Tab completion that asks the target** for paths, cmdlet names, and parameters through PowerShell's own `TabExpansion2`.
- **A session that recovers.** A dropped connection re-dials and re-attaches the same shell, and a shell the target has forgotten is re-opened loudly, never silently.
- **SOCKS5 pivoting**, configurable timeouts, and a single static binary for Linux, macOS, and Windows.

Tested against Windows 11 25H2 with current Defender signatures and Windows Server 2025.
