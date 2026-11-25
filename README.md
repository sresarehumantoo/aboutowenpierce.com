# aboutowenpierce.com

Personal site of Owen Pierce: blog, projects, and resume. A static Next.js export deployed to GitHub Pages.

```bash
npm ci
npm run dev     # local preview
npm run build   # static site in out/
```

Content lives in `content/`: posts and projects are Markdown with frontmatter, and `experience.json` drives the About page. Pushing to `main` builds and deploys through `.github/workflows/pages.yml`.
