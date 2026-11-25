#!/usr/bin/env node
// Generates the favicon and app-icon set from one flat isometric cube: a
// simplified Logo3D, colored top layer over a grey bottom layer.
//
//   node scripts/make-icons.mjs
//
// Writes src/app/{icon.svg,favicon.ico,apple-icon.png}, public/favicon.svg and
// public/icons/*.png. Needs rsvg-convert and ImageMagick (`magick`).

import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APP = join(ROOT, 'src', 'app')
const ICONS = join(ROOT, 'public', 'icons')

const LIGHT = { top: '#60a5fa', right: '#2563eb', left: '#1e40af', lowRight: '#94a3b8', lowLeft: '#64748b' }
const DARK = { top: '#c4b5fd', right: '#8b5cf6', left: '#6d28d9', lowRight: '#d4d4d8', lowLeft: '#a1a1aa' }
const TILE = { top: '#c4b5fd', right: '#8b5cf6', left: '#6d28d9', lowRight: '#71717a', lowLeft: '#52525b' }

// 32-unit grid, 2:1 isometric slope. Bounding box x 3..29, y 2..30.
const faces = [
  ['top', '16,2 29,8.5 16,15 3,8.5'],
  ['left', '3,8.5 16,15 16,22.5 3,16'],
  ['right', '16,15 29,8.5 29,16 16,22.5'],
  ['lowLeft', '3,16 16,22.5 16,30 3,23.5'],
  ['lowRight', '16,22.5 29,16 29,23.5 16,30'],
]

const polys = (fill) => faces.map(([k, p]) => `<polygon class="${k}" points="${p}" fill="${fill(k)}"/>`).join('')

function faviconSvg() {
  const darkRules = Object.entries(DARK).map(([k, c]) => `.${k}{fill:${c}}`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>@media (prefers-color-scheme:dark){${darkRules}}</style>${polys((k) => LIGHT[k])}</svg>\n`
}

// Opaque full-bleed tile (iOS and maskable icons ignore transparency), cube
// scaled around the center. The cube's farthest corner sits 15 units from the
// center, so 0.7 keeps it inside the maskable 40%-radius safe zone.
function tileSvg(scale) {
  const t = 16 - 16 * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27272a"/><stop offset="1" stop-color="#18181b"/></linearGradient></defs><rect width="32" height="32" fill="url(#g)"/><g transform="translate(${t} ${t}) scale(${scale})">${polys((k) => TILE[k])}</g></svg>\n`
}

const tmp = mkdtempSync(join(tmpdir(), 'icons-'))
const svgFile = (name, body) => {
  const p = join(tmp, name)
  writeFileSync(p, body)
  return p
}
const png = (src, size, out) => execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', out, src])

try {
  mkdirSync(ICONS, { recursive: true })
  const fav = faviconSvg()
  writeFileSync(join(APP, 'icon.svg'), fav)
  writeFileSync(join(ROOT, 'public', 'favicon.svg'), fav)

  // ICO from the light variant: .ico cannot follow the color scheme, and the
  // light palette keeps enough contrast on dark tab bars.
  const lightSrc = svgFile('light.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${polys((k) => LIGHT[k])}</svg>`)
  const icoParts = [16, 32, 48].map((s) => {
    const out = join(tmp, `ico-${s}.png`)
    png(lightSrc, s, out)
    return out
  })
  execFileSync('magick', [...icoParts, join(APP, 'favicon.ico')])

  const tile = svgFile('tile.svg', tileSvg(0.78))
  const maskable = svgFile('maskable.svg', tileSvg(0.7))
  png(tile, 180, join(APP, 'apple-icon.png'))
  png(tile, 192, join(ICONS, 'icon-192.png'))
  png(tile, 512, join(ICONS, 'icon-512.png'))
  png(maskable, 512, join(ICONS, 'icon-maskable-512.png'))
  for (const f of [join(APP, 'apple-icon.png'), ...['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'].map((f) => join(ICONS, f))]) {
    execFileSync('magick', [f, '-strip', '-alpha', 'off', f])
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
