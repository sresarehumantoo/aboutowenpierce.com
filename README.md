# aboutowenpierce.com

Personal site of Owen Pierce: blog, projects, and resume. A static Next.js export deployed to GitHub Pages.

```bash
npm ci
npm run dev     # local preview
npm run lint
npm run build   # static site in out/
```

Content lives in `content/`: posts and projects are Markdown with frontmatter, and `experience.json` drives the About page. Frontmatter is validated at build time, so an unknown key, a bad date, or a missing image fails the build. Cover art is generated with `scripts/make-cover.mjs`. Pushing to `main` builds and deploys through `.github/workflows/pages.yml`.

## License

The source code is released under the [MIT License](LICENSE), and so is the generated cover art in `public/images/covers/`. The MIT license does not cover the site's content: the writing in `content/` (posts and project write-ups) and the other images in `public/images/`, including the profile photo, are all rights reserved and may not be reused without permission.
