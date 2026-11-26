---
title: "rummage (formerly go-finder)"
description: "A cross-platform terminal file picker, explorer and fuzzy finder library for Go. Pure Go, no CGO: one call returns the selected path, and it works everywhere a terminal runs."
techStack: ["Go", "Bubble Tea", "Lip Gloss", "TUI"]
links: {"github": "https://github.com/rummage-dev/rummage"}
featured: true
status: maintained
license: MIT
completedAt: 2026-03-22
featuredImage: /images/covers/go-finder.png
draft: false
---
A cross-platform, terminal-based file and folder picker library for Go. Built on [Bubble Tea](https://github.com/charmbracelet/bubbletea) and [Lip Gloss](https://github.com/charmbracelet/lipgloss), rummage provides interactive file selection without native OS dialogs, CGO bindings, or external tools.

It started in March 2026 as **go-finder** under [my GitHub account](https://github.com/sresarehumantoo/go-finder). In May 2026, with v0.3.0, it was renamed to rummage and moved to its own [rummage-dev organization](https://github.com/rummage-dev/rummage). The package name is still `finder`, so the API didn't change, only the import path; the old repository URL redirects to the new one.

```bash
go get github.com/rummage-dev/rummage@latest
```

## Why rummage?

Most Go file picker libraries rely on native OS dialogs (GTK, Cocoa, Win32), which means they require CGO, platform-specific build toolchains, and won't work in headless environments like SSH sessions or Docker containers. rummage takes a different approach: **everything runs in the terminal**.

That makes it a good fit for:

- **CLI applications** that need user file selection
- **Server-side tools**: works over SSH and in tmux or screen sessions
- **Cross-compiled binaries**: no CGO means `GOOS=linux GOARCH=arm64 go build` just works
- **WSL environments**: includes path conversion utilities between Windows and WSL paths

Most terminal pickers for Go are components you wire into your own Bubble Tea update and view loop. rummage is a single call that returns the selected path, and it can still be embedded as a Bubble Tea sub-model when you want full control.

## Architecture

rummage follows the **Elm Architecture** (Model-Update-View) via the Bubble Tea TUI framework, so all state transitions go through one update function, which keeps the system predictable and testable.

The architecture breaks down into layers:

- **Public API** (`finder.go`): four entry points, `PickFile`, `PickFolder`, `PickAny` and `PickMultiple`, plus `New` for embedding
- **Model** (`model.go`): all application state, including current directory, cursor position, selections, search query and input mode
- **Update** (`model.go`): the state transition function that handles keyboard events and async messages
- **View** (`view.go`): the rendering function that produces terminal output via Lip Gloss styles
- **Filesystem** (`filesystem.go`): OS operations isolated behind async Bubble Tea commands, with a pluggable backend so the picker can browse any `io/fs.FS`, such as an `embed.FS`

Directory reads are async, so the UI never blocks waiting for slow filesystems or network mounts.

## State Machine

The picker operates as a state machine with four modes:

- **Browsing**: the default. Navigate with vim keys (`h/j/k/l`) or arrow keys, open directories, select files
- **Searching**: press `/` to filter entries in real time. Matching is fuzzy, ranked best-match-first, with matched characters highlighted; backspace widens the filter
- **Creating**: press `n` for a new file or `N` for a new folder. A trailing `/` on a filename creates a directory instead
- **Confirming**: delete confirmation with a `y/n` prompt

## Cross-Platform Support

rummage is pure Go with no build tags and no CGO, and its release builds cover **8 platform targets**: Linux, macOS, Windows, and FreeBSD, each on amd64 and arm64.

For WSL users, built-in path conversion utilities handle the translation:

```go
finder.ToWindowsPath("/mnt/c/Users/owen")  // → "C:\Users\owen"
finder.ToWSLPath(`C:\Users\owen`)           // → "/mnt/c/Users/owen"
finder.IsWSL()                               // → true/false
```

## Four Pick Modes

The library supports four selection modes, each with distinct behavior:

| Mode | Function | Behavior |
|------|----------|----------|
| **File** | `PickFile()` | Enter on directory navigates in, enter on file selects it |
| **Folder** | `PickFolder()` | Only directories selectable, files shown but not selectable |
| **Any** | `PickAny()` | Tab/space selects files or directories directly |
| **Multiple** | `PickMultiple()` | Multi-select with `space`, selections persist across directories, `ctrl+a` toggles all |

## Usage

```go
import finder "github.com/rummage-dev/rummage"

// Simple file picker
path, err := finder.PickFile()

// Folder picker starting in home directory
path, err := finder.PickFolder(
    finder.WithStartDir("~"),
    finder.WithTitle("Select project directory"),
)

// Multi-select with glob filter
paths, err := finder.PickMultiple(
    finder.WithFilter("*.go", "*.mod"),
    finder.WithHidden(true),
)

// Only document types, matched case-insensitively
path, err := finder.PickFile(
    finder.WithExtensions("pdf", "docx", "doc"),
)
```

## Configuration

All configuration uses the **functional options pattern**:

```go
finder.PickFile(
    finder.WithStartDir("/home/owen/projects"),
    finder.WithFilter("*.go"),
    finder.WithHidden(true),
    finder.WithTitle("Select a Go file"),
    finder.WithHeight(20),
    finder.WithInteractive(true),    // Enable create/delete
    finder.WithExpandSymlinks(true), // Resolve symlinks
    finder.WithPreview(true),        // Side pane previewing the highlighted entry
)
```

Every keybinding is customizable via `WithKeyMap()`, and every visual element is styleable via `WithStyles()`: 21 configurable style elements covering everything from cursor color to help bar formatting and the preview pane.

## Design Decisions

- **TUI over native dialogs**: portability wins. The library works in any environment with a terminal: SSH, Docker, CI runners, Git Bash, WSL
- **Async directory reads**: Bubble Tea commands handle filesystem I/O off the main thread, keeping the UI responsive even on slow mounts
- **Cursor memory**: when navigating back from a subdirectory, the cursor returns to that directory's position in the parent listing
- **Smart truncation**: directory paths truncate from the left (`…/deeply/nested/path`), filenames truncate from the right (`very-long-file…`), and both count display width rather than bytes, so a multibyte name is never cut mid-character
- **Vim-first navigation**: `h/j/k/l`, `g/G`, `ctrl+u/d`, with full arrow key support as a fallback
- **Filenames are untrusted input**: names, previewed file contents and error messages (which embed paths) are stripped of control characters before rendering, so a crafted filename can't send escape sequences to your terminal to rewrite the window title, spoof the UI or write to the clipboard

## Status

Maintained. The latest release is v0.3.2 (September 2026), a security and maintenance release; the [changelog](https://github.com/rummage-dev/rummage/blob/main/CHANGELOG.md) covers the full history from the first go-finder release.
