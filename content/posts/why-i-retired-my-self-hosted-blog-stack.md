---
title: "Why I Retired My Self-Hosted Blog Stack"
excerpt: "I ran my blog on Next.js, Payload CMS and PostgreSQL across hardened VMs, with Terraform, Ansible, CI and a preprod environment. It was a great lab and a bad way to publish four posts. What it cost, and how I moved it to a static site."
publishedAt: 2026-11-24
categories: ["DevOps", "Architecture", "Lessons Learned"]
featuredImage: /images/covers/why-i-retired-my-self-hosted-blog-stack.png
draft: false
---
The older posts on this site spend a lot of words on the infrastructure behind it: environment separation, defense in depth, Terraform and Ansible working together, backups to object storage. All of that was real, and I was proud of it.

As of today, the blog is a folder of Markdown files, built into static HTML and served from GitHub Pages. Here's why, and what the old stack taught me before I turned it off.

## What it was

The short version of the old architecture:

```
  visitor
     |
  CDN / proxy
     |
  reverse proxy (Traefik, TLS)
     |
  app VM ------------------> database VM
  - Next.js + Payload CMS      - PostgreSQL, TLS-only,
  - MCP server for agents        in its own isolated zone
  - headless Chromium
     |
  S3-compatible storage
  - media uploads
  - nightly and weekly DB backups
```

Around that:

- Terraform to create the VMs on Proxmox, Ansible roles for hardening, Docker, PostgreSQL, dynamic DNS and app deployment.
- Separate preprod and prod environments, each with its own database and buckets.
- GitLab CI that linted, built and pushed images on every branch, with manual gates for deploys.
- Read-only containers with all capabilities dropped, secrets pulled from Vault at deploy time, hardened SSH with fail2ban, Postgres listening only where it had to.
- A Model Context Protocol (MCP) server so AI agents could draft and edit content through the CMS API, with its own API keys and a dedicated non-admin CMS user.

It was a good lab, and I've used something from every one of those pieces since. But its actual job was serving a handful of blog posts.

## What it cost

The clearest picture of the cost came from one dependency upgrade pass this year: Next.js to 16, Payload to its latest 3.x, TypeScript to 6. The upgrade itself went fine. Along the way, though, I found and fixed a string of defects, and **none of them were caused by the upgrade.** They had been there all along and nothing had ever exercised them. Among them:

- The MCP server's browser tools had never worked in a deployed container. The bundled Chromium was built against glibc and the image was Alpine, and it was cached under root's home directory where the non-root runtime user couldn't find it. The diagram tool also launched Chromium without the flag it needs to run inside a container.
- The MCP service account had never been created in preprod, so every MCP call there returned 401.
- The database schema in preprod was missing a column the media storage plugin needed. My schema template was entirely `CREATE TABLE IF NOT EXISTS`, so it could create a database but never evolve one.
- Generated TypeScript types were missing the same field, for the same root cause: anything derived from the Payload config on a machine without storage credentials silently left out the storage plugin's contributions.
- Image sizes configured in the media collection had been silently skipped, because the image library was never passed into the CMS config. Every "thumbnail" was the full-size original.

Then there was the ongoing friction, which wasn't a bug so much as a tax:

- The CMS supported only specific Next.js ranges, so a casual `next@latest` would fail the install outright. Its five packages pinned each other at exact versions, and npm couldn't lift them as a set, so every CMS bump meant deleting and regenerating the lockfile.
- That regeneration had to happen inside the CI runtime's Node version. Regenerating on my workstation's older Node quietly downgraded a transitive package whose newest release required a newer engine.
- Schema changes were manual. Nothing in the deploy path ran migrations; the deployed schema came from a hand-maintained SQL template. Every CMS upgrade needed a drift check by hand: stand up a database from the template, boot each version against it, dump both schemas, diff.
- Dev mode was dangerous near real data. In development mode the CMS reconciles the database to its own model, which would have dropped an index I'd added by hand to back API key lookups.

And the production deploy path had never been run end to end through the tagged-release pipeline. The stack was tested, but its most important path got the least practice.

None of this is a knock on the tools. Payload, Next.js and Postgres are all good software. The problem was the ratio: I was operating a content management system, a database, an object store, a reverse proxy, a second environment and an agent API to publish Markdown-shaped text that changes a few times a year.

## The question that settled it

What does this site actually need to do at runtime?

Serve HTML and images. Let people search posts. Offer an RSS feed and a sitemap. Nothing on it is per-user, nothing accepts input that has to be stored, and nothing changes between deploys.

All of that can be computed at build time. Once I wrote it down, the database, the CMS, the reverse proxy, the app VM and its hardening were plainly attack surface and maintenance whose only output never changed between builds.

## How the migration worked

**Get the content out.** The content lived in Postgres, so step one was a small export script that walks the CMS's REST API, writes each published post and project as Markdown with YAML frontmatter, writes work history as JSON, and downloads referenced media into the repo.

One gotcha: I needed to reach the old origin by address while sending the real site name as the `Host` header and TLS SNI, and accept its certificate. Node's global `fetch` silently drops a custom `Host` header and has no per-request way to accept a self-signed certificate, so the script uses `node:http`/`node:https` directly:

```js
// node:http instead of fetch: global fetch silently drops a custom Host header
// and offers no per-request way to accept a self-signed certificate.
const headers = { accept: '*/*' }
if (sameOrigin && args.host) headers.host = args.host
const opts = { headers }
if (target.protocol === 'https:') {
  if (sameOrigin && args.host) opts.servername = args.host
  if (args.insecure) opts.rejectUnauthorized = false
}
```

**Keep the frontend, drop the backend.** The site was already Next.js, so I kept the pages, components and styles and replaced every CMS query with a function that reads the `content/` directory at build time. The whole data layer is now one small module built on `gray-matter`:

```ts
function allPosts(): Post[] {
  postsCache ??= readCollection('posts')
    .filter(({ data }) => !data.draft)
    .map(({ slug, data, content }) => ({ slug, title: String(data.title ?? slug), /* ... */ }))
    .sort((a, b) => byDateDesc(a.publishedAt, b.publishedAt))
  return postsCache
}
```

A `draft: true` flag in frontmatter keeps a post out of every page, feed and index, which is how this post sat in the repo until it was ready.

**Make the dynamic bits static.** With `output: 'export'` in the Next config, the build emits plain files. Search used to be an API route querying the database. Now a statically generated `search-index.json` holds every post and project, and the search page fetches it once and filters in the browser. RSS and the sitemap are generated at build time the same way. Image optimization is off, because there's no server to resize on request.

**Deploy the boring way.** A GitHub Actions workflow runs `npm ci` and `npm run build` on pushes to `main` and publishes the output directory to Pages. No runners of my own, no images, no deploy keys into my network.

## What I gave up

- An admin UI. Writing a post now means editing Markdown in a repo. For me that's an upgrade, but it is a change.
- The agent API. The MCP server is gone, and agents (and I) work on content the same way as code: files, diffs, and a review before merge.
- On-the-fly image resizing. Images need to be sized sensibly before they go in.
- Anything server-side. If I ever want comments, forms or per-user features, that will be a deliberate new decision, probably a third-party service, rather than something the platform quietly allows.

## What I kept

The patterns from this stack (environments, hardened containers, secrets from Vault, IaC through CI) are the same ones I use across the rest of my homelab, where they protect things that actually need a server. What the blog taught me was about fitting the system to the job.

"Production-grade" depends on what production does. Hardening an origin is good practice; not having one is better security.

Untested paths rot even when nothing changes. Real defects sat for months in a stack I was actively maintaining, because nothing exercised them, and fewer moving parts leaves fewer places for that to happen.

A lab and a product can be the same thing for a while. Eventually the lab's complexity turns into the product's maintenance burden.

The old stack's code still exists, and I'll probably mine it for future posts. The blog itself is a folder of text files now.
