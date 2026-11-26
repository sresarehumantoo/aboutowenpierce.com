---
title: "Payload CMS MCP Server"
description: "A Model Context Protocol server that gave AI agents full content management on this site's old Payload CMS: creating posts, uploading media, rendering diagrams, and managing site content through 29 purpose-built tools."
techStack: ["TypeScript", "MCP SDK", "Node.js", "Puppeteer", "Mermaid", "Payload CMS"]
links: {}
featured: true
status: archived
privateSource: true
completedAt: 2026-03-21
featuredImage: /images/covers/payload-cms-mcp-server.png
draft: false
---
> **Archived, November 2026:** this server was retired on 2026-11-25 along with the rest of the self-hosted stack it served. The site is now a static export built from Markdown in a Git repository, so there is no CMS left for it to talk to: agents work on content the same way they work on code, through files and reviewed diffs. [Why I Retired My Self-Hosted Blog Stack](/blog/why-i-retired-my-self-hosted-blog-stack/) explains the move, and [Building a Production-Grade Self-Hosted Blog](/blog/building-a-production-grade-self-hosted-blog/) describes the stack it ran on. The source lives in a private repository; the design is what's worth keeping, so that's what this page covers.

An MCP (Model Context Protocol) server that wrapped the Payload CMS REST API, letting AI agents like Claude Code manage website content programmatically, from writing blog posts to rendering infographics to managing the full content lifecycle.

## Why Build This?

Managing content through a CMS admin panel works fine for humans, but AI agents need a structured, tool-based interface. MCP provides exactly that: a standardized protocol for AI-to-application communication.

This server bridged the gap. Claude Code (or any MCP client) got 29 purpose-built tools for every content operation the site supported, while Payload CMS handled persistence, media processing, and access control.

## Architecture

The server started out running locally on my workstation, spawned by the agent over stdio. In its final version it also ran as its own container next to the app, speaking MCP's Streamable HTTP transport behind the site's reverse proxy at `/mcp`:

```
Agent → HTTPS → reverse proxy (/mcp) → MCP container → Payload REST API → PostgreSQL + S3
```

The same code served both transports, selected by an environment variable, so stdio stayed available for local work.

Authentication had two separate legs:

- **Agent to MCP server:** bearer API keys. Keys were generated in the CMS admin panel and shown once; the CMS stored only a SHA-256 hash, and revoking a key meant marking it inactive. The server hashed each presented token and checked it against the CMS, caching valid results for five minutes (and invalid ones for 30 seconds) so it didn't hit the database on every request. Only the health check was unauthenticated, and the reverse proxy rate-limited the endpoint separately from the main site.
- **MCP server to Payload:** Payload's built-in JWT system. The server logged in with email and password as a dedicated, non-admin editor account and reused the token, refreshing it before the one-hour expiry. An agent with a valid key could do what an editor could do, and no more.

## Tool Categories

### Content Management (12 tools)

- **Posts**: list, get, create, update, delete, with support for Markdown content, categories, featured images, and a draft/publish workflow
- **Projects**: list, get, create, update, delete, with tech stack arrays, live/GitHub URLs, and featured flags
- **Categories**: list, create

### Media & Rendering (5 tools)

- **Media**: upload (local file or URL), list, get
- **Mermaid Diagrams**: render Mermaid markup to PNG or SVG, optionally uploading the result to the media library
- **HTML/CSS Renderer**: render arbitrary HTML/CSS to retina-quality PNG via headless Chromium, for Confluence-style infographics, styled tables, architecture cards, and any visual content Markdown can't express

### Site Management (12 tools)

- **Search**: full-text search across posts and projects
- **Globals**: read and update site settings, read navigation
- **Pages**: list, get, create
- **Experience**: full CRUD for resume entries (work, education, certifications)

## Key Design Decisions

### File-Based Content Workflow

Every tool that accepts content (posts, diagrams, HTML) supports both inline strings and file paths. This enables a natural agent workflow:

1. Write complex content to a temp file
2. Iterate and refine
3. Upload via MCP tool with just the file path

### Slug Generation

The Posts collection filled in slugs from a `beforeChange` hook, but the slug field was also required, and a REST create without one was rejected before the hook could help. The MCP server generates URL slugs client-side from the title instead.

### Numeric ID Coercion

Payload uses numeric IDs for relationships, but MCP tool parameters are strings. The server automatically coerces string IDs to numbers for relationship fields (featured images, categories).

### SSRF Protection

Uploading media from a URL means the server fetches whatever an agent asks for, so the upload tool validates URLs before fetching. It allows only `http` and `https`, and blocks hostnames that are loopback, private, or link-local addresses (IPv4 and IPv6), `localhost`, and anything under `.local` or `.internal`.

That check runs on the hostname as written. It doesn't resolve DNS or re-check redirects, so a public name that resolves to a private address would have passed. A version that stayed in service would need to validate the resolved address on every hop.

### Chromium in a Container

Both rendering tools drive headless Chromium. The container image used Alpine's own Chromium package rather than the browser Puppeteer downloads, which is built against glibc and can't run on Alpine, and both tools launch it with `--no-sandbox`, which Chromium needs inside a container.

## Tech Stack

- **Runtime**: Node.js 22
- **MCP SDK**: `@modelcontextprotocol/sdk` for protocol handling, tool registration, and both transports
- **HTTP**: Express for the Streamable HTTP endpoint
- **Diagram Rendering**: `@mermaid-js/mermaid-cli`
- **HTML Rendering**: Puppeteer directly, for HTML/CSS → PNG screenshots
- **Language**: TypeScript with strict mode

## Results

The MCP server enabled AI-assisted content creation for the entire site, from this project description to the blog posts with rendered infographics. Every post published during development was created, formatted, and uploaded through MCP tools without touching the admin panel.
