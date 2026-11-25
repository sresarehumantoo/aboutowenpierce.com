---
title: "dfinstall"
description: "An idempotent, reversible workstation configurator in Go for Linux, WSL2 and macOS: one command links configs and installs tools, with dry-run, snapshots and drift detection."
techStack: ["Go", "Linux", "macOS", "WSL2", "Homebrew", "apt"]
links: {"github": "https://github.com/sresarehumantoo/dotfiles"}
featured: false
status: active
license: MIT
completedAt: 2024-05-28
featuredImage: /images/covers/dfinstall.png
demo: {"src": "/images/projects/dfinstall-demo.mp4", "poster": "/images/projects/dfinstall-demo-poster.png", "alt": "Terminal recording: dfinstall status and doctor report installed and missing modules, then install all --dry-run lists what it would change without writing anything."}
---
## What it is

dfinstall is the CLI behind my `dotfiles` repository: one static Go binary that symlinks configs, installs tools and keeps every machine I use identical. It runs on Linux, WSL2 and macOS, installs packages through apt, dnf, pacman or Homebrew, and walks 29 modules in dependency order, from system packages and the shell through the editor, terminal and desktop to platform tuning. Platform-specific modules skip themselves where they don't apply.

## Why it exists

Most dotfiles repos are a pile of symlinks and a `bootstrap.sh` nobody dares re-run. I wanted a real tool instead:

- **Idempotent.** `install all` converges, so running it twice changes nothing the second time.
- **Reversible.** A run can snapshot everything it is about to touch, and `restore` puts it back.
- **Previewable.** `--dry-run` shows every change without writing a byte.
- **Honest.** `status`, `diff` and `doctor` report what actually drifted.

## Install

Every release publishes binaries for Linux and macOS on amd64 and arm64, as archives, a Homebrew formula and a `.deb` in a signed apt repository.

```sh
# Homebrew (macOS or Linux)
brew install sresarehumantoo/tap/dfinstall

# Go
go install github.com/sresarehumantoo/dotfiles/v3/cmd/dfinstall@latest

dfinstall init                     # use the configs shipped with the binary
dfinstall install all --dry-run    # preview everything
dfinstall install all
```

The apt instructions, including the keyring and its fingerprint, are in the [README](https://github.com/sresarehumantoo/dotfiles#install). Bootstrap scripts for WSL (from PowerShell) and macOS start from a bare machine and end with `dfinstall install all`.

## How it works

- **Two ways to hold configs.** By default `init` uses a read-only copy of the configs shipped with the release, which needs no git and no access to GitHub. `init --clone` makes a git checkout instead, for a machine where I edit and commit configs.
- **Upgrades that respect local edits.** `update` fast-forwards the clone and updates what dfinstall installed. An edit that only adds lines or sets keys can be moved into an override file that loads after the managed one, so the clone goes back to upstream and the setting keeps applying. Edits that would conflict make it skip the pull and say why.
- **Self-updating where it owns the binary.** A release binary downloads the newer release, checks its sha256 against the release listing and swaps itself in place. Homebrew, apt and `go install` builds are left to their package manager, with the command printed.
- **Drift warnings.** A new zsh checks in the background whether something changed a managed file behind dfinstall's back, at most every ten minutes, and reports each finding once at a later prompt without fixing anything itself.

## Key design decisions

- **One canonical clone.** The clone in use is recorded, so two checkouts on one machine can't fight over the symlinks.
- **The first run is always backed up.** The first install snapshots everything it touches, and a failed first run stays a first run, so the safety net is still armed next time.
- **Snapshots record the original state** (missing, symlink or regular file), so `restore` undoes exactly what dfinstall changed.
- **Plain output when the terminal can't take it.** ASCII symbols and no spinner on `TERM=dumb`, the Linux console and non-UTF-8 locales, and color follows `NO_COLOR`.

## Status

Actively developed, with releases on GitHub; 3.0 made the shipped configs the default and moved the Go module path to `/v3`.
