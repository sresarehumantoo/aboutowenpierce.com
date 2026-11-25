#!/usr/bin/env node
// Generates a 1200x630 cover (card thumbnail + og:image) for a post or project.
//
//   node scripts/make-cover.mjs <slug> --motif <name> [--seed <n>] [--accent blue|purple|pink] [--no-png]
//   node scripts/make-cover.mjs --list
//
// Writes public/images/covers/<slug>.svg and, unless --no-png, <slug>.png via
// rsvg-convert (quantized with ImageMagick and recompressed with optipng when present).

import { writeFileSync, mkdirSync, statSync, renameSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const W = 1200
const H = 630
const CX = 600
const CY = 315
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'covers')

const ACCENTS = {
  blue: { hi: '#60a5fa', deep: '#2563eb' },
  purple: { hi: '#a78bfa', deep: '#7c3aed' },
  pink: { hi: '#f472b6', deep: '#db2777' },
}

const n = (v) => Math.round(v * 10) / 10

function hashSeed(str) {
  let h = 2166136261
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRng(seed) {
  const r = mulberry32(seed)
  r.range = (lo, hi) => lo + r() * (hi - lo)
  r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1))
  r.pick = (arr) => arr[Math.floor(r() * arr.length)]
  return r
}

function defs(accent) {
  return `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d1328"/>
    <stop offset="0.55" stop-color="#18181b"/>
    <stop offset="1" stop-color="#1d1433"/>
  </linearGradient>
  <linearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="140" y1="0" x2="1060" y2="0">
    <stop offset="0" stop-color="#60a5fa"/>
    <stop offset="0.5" stop-color="#a78bfa"/>
    <stop offset="1" stop-color="#f472b6"/>
  </linearGradient>
  <linearGradient id="sweepFill" gradientUnits="userSpaceOnUse" x1="140" y1="0" x2="1060" y2="0">
    <stop offset="0" stop-color="#2563eb"/>
    <stop offset="0.5" stop-color="#7c3aed"/>
    <stop offset="1" stop-color="#db2777"/>
  </linearGradient>
  <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2e2e36"/>
    <stop offset="1" stop-color="#1c1c22"/>
  </linearGradient>
  <radialGradient id="glowBlue" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#2563eb" stop-opacity="0.45"/>
    <stop offset="0.6" stop-color="#2563eb" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#2563eb" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowPurple" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#7c3aed" stop-opacity="0.45"/>
    <stop offset="0.6" stop-color="#7c3aed" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#7c3aed" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowAccent" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${accent.deep}" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="${accent.deep}" stop-opacity="0.15"/>
    <stop offset="1" stop-color="${accent.deep}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
  </radialGradient>
  <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
    <circle cx="15" cy="15" r="1.1" fill="#ffffff" fill-opacity="0.07"/>
  </pattern>
  <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b1"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b2"/>
    <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>`
}

function background(rng) {
  const sparks = []
  for (let i = 0; i < 26; i++) {
    const x = 15 + 30 * rng.int(0, 39)
    const y = 15 + 30 * rng.int(0, 20)
    sparks.push(`<circle cx="${x}" cy="${y}" r="${n(rng.range(1.3, 2.2))}" fill="url(#sweep)" fill-opacity="${n(rng.range(0.25, 0.6))}"/>`)
  }
  const gx = rng.range(180, 380)
  const gy = rng.range(120, 260)
  const px = rng.range(820, 1020)
  const py = rng.range(370, 510)
  return `<rect width="${W}" height="${H}" fill="url(#bg)"/>
<ellipse cx="${n(gx)}" cy="${n(gy)}" rx="420" ry="300" fill="url(#glowBlue)"/>
<ellipse cx="${n(px)}" cy="${n(py)}" rx="440" ry="320" fill="url(#glowPurple)"/>
<ellipse cx="${CX}" cy="${CY}" rx="300" ry="230" fill="url(#glowAccent)" opacity="0.55"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
<g>${sparks.join('')}</g>`
}

function seriesMark() {
  return `<g transform="translate(1046 560)" fill="none" stroke="#a1a1aa" stroke-opacity="0.45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0 L9 7.5 L0 15"/><path d="M15 16 H28"/></g>`
}

function isoCube(x, y, hw, hh, ht, { fill = true, dashed = false, opacity = 1 } = {}) {
  const top = `M${n(x)} ${n(y - hh)} L${n(x + hw)} ${n(y)} L${n(x)} ${n(y + hh)} L${n(x - hw)} ${n(y)} Z`
  const left = `M${n(x - hw)} ${n(y)} L${n(x)} ${n(y + hh)} L${n(x)} ${n(y + hh + ht)} L${n(x - hw)} ${n(y + ht)} Z`
  const right = `M${n(x + hw)} ${n(y)} L${n(x)} ${n(y + hh)} L${n(x)} ${n(y + hh + ht)} L${n(x + hw)} ${n(y + ht)} Z`
  const dash = dashed ? ' stroke-dasharray="5 6"' : ''
  if (!fill) {
    return `<g fill="none" stroke="url(#sweep)" stroke-width="1.6" stroke-linejoin="round" opacity="${opacity}"${dash}><path d="${left}"/><path d="${right}"/><path d="${top}"/></g>`
  }
  return `<g stroke="url(#sweep)" stroke-width="1.6" stroke-linejoin="round" opacity="${opacity}"${dash}>
<path d="${left}" fill="#23232b"/><path d="${right}" fill="#1a1a21"/><path d="${top}" fill="url(#sweepFill)" fill-opacity="0.55"/></g>`
}

function cylinder(cx, cy, rx, ry, h, platters, { opacity = 1 } = {}) {
  const body = `M${cx - rx} ${cy} L${cx - rx} ${cy + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + h} L${cx + rx} ${cy} Z`
  const lines = []
  for (let i = 1; i < platters; i++) {
    const y = n(cy + (h * i) / platters)
    lines.push(`<path d="M${cx - rx} ${y} A${rx} ${ry} 0 0 0 ${cx + rx} ${y}" fill="none" stroke-opacity="0.6"/>`)
  }
  return `<g stroke="url(#sweep)" stroke-width="2" opacity="${opacity}">
<path d="${body}" fill="url(#face)"/>${lines.join('')}
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2a2a33"/>
<ellipse cx="${cx}" cy="${cy}" rx="${n(rx * 0.55)}" ry="${n(ry * 0.55)}" fill="url(#sweepFill)" fill-opacity="0.35" stroke="none"/></g>`
}

function shieldPath(cx, cy, h) {
  const w = h * 0.8
  const hw = w / 2
  return `M${n(cx)} ${n(cy - 0.5 * h)} L${n(cx + hw)} ${n(cy - 0.34 * h)} L${n(cx + hw)} ${n(cy + 0.02 * h)} Q${n(cx + hw)} ${n(cy + 0.32 * h)} ${n(cx)} ${n(cy + 0.5 * h)} Q${n(cx - hw)} ${n(cy + 0.32 * h)} ${n(cx - hw)} ${n(cy + 0.02 * h)} L${n(cx - hw)} ${n(cy - 0.34 * h)} Z`
}

const motifs = {
  layers: {
    about: 'Nested shields with probes stopped at the outer layers (defense in depth)',
    draw(rng, a) {
      const cy = 322
      const heights = [500, 424, 348, 272, 196, 124]
      const out = []
      heights.forEach((h, i) => {
        const dash = i < 2 ? ' stroke-dasharray="3 9"' : ''
        out.push(`<path d="${shieldPath(CX, cy, h)}" fill="#18181b" fill-opacity="${n(0.12 + i * 0.05)}" stroke="url(#sweep)" stroke-width="${n(1.4 + i * 0.35)}" stroke-opacity="${n(0.3 + i * 0.13)}" stroke-linecap="round"${dash}/>`)
      })
      const core = `<g filter="url(#glow)"><path d="${shieldPath(CX, cy, heights[5])}" fill="url(#sweepFill)" fill-opacity="0.3" stroke="${a.hi}" stroke-width="2.6"/></g>
<g fill="#f4f4f5"><circle cx="${CX}" cy="${cy - 12}" r="11"/><path d="M${CX - 6} ${cy - 6} L${CX + 6} ${cy - 6} L${CX + 9} ${cy + 22} L${CX - 9} ${cy + 22} Z"/></g>`
      const probes = []
      for (const side of [-1, 1]) {
        const used = new Set()
        for (let k = 0; k < 3; k++) {
          const layer = [0, 1, 2][k]
          const h = heights[layer]
          let y
          do y = n(cy + rng.range(-0.3, 0.0) * h)
          while ([...used].some((u) => Math.abs(u - y) < 34))
          used.add(y)
          const stopX = CX + side * (h * 0.4 + 8)
          const startX = side < 0 ? rng.range(110, 170) : rng.range(1030, 1090)
          probes.push(`<path d="M${n(startX)} ${y} L${n(stopX)} ${y}" stroke="#f472b6" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>
<path d="M${n(stopX)} ${y - 11} L${n(stopX)} ${y + 11}" stroke="#f472b6" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>`)
        }
      }
      return out.join('\n') + '\n' + probes.join('\n') + '\n' + core
    },
  },

  backup: {
    about: '3-2-1: two local copies on different media, one offsite, with a retention timeline',
    draw(rng, a) {
      const out = []
      out.push(`<rect x="770" y="140" width="250" height="300" rx="22" fill="#7c3aed" fill-opacity="0.06" stroke="url(#sweep)" stroke-width="1.6" stroke-dasharray="4 9" stroke-linecap="round"/>`)
      out.push(cylinder(330, 215, 88, 26, 160, 4))
      const bx = 600
      out.push(`<g stroke="url(#sweep)" stroke-width="2">
<path d="M${bx - 88} 222 L${bx - 66} 372 Q${bx} 396 ${bx + 66} 372 L${bx + 88} 222 Z" fill="url(#face)"/>
<path d="M${bx - 78} 290 Q${bx} 312 ${bx + 78} 290" fill="none" stroke-opacity="0.55"/>
<ellipse cx="${bx}" cy="222" rx="88" ry="24" fill="#2a2a33"/></g>`)
      out.push(`<g filter="url(#glow)">${cylinder(895, 215, 80, 24, 150, 3)}</g>`)
      out.push(`<path d="M430 300 L500 300" stroke="url(#sweep)" stroke-width="2.6" stroke-linecap="round"/><path d="M490 291 L501 300 L490 309" fill="none" stroke="url(#sweep)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`)
      out.push(`<path d="M600 185 C 640 70, 820 70, 880 168" fill="none" stroke="url(#sweep)" stroke-width="2.4" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M870 160 L882 172 L886 155" fill="none" stroke="#f472b6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`)
      out.push(`<g fill="none" stroke="${a.hi}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"><path d="M 182 274 A 28 28 0 1 1 184 296"/><path d="M174 266 L182 274 L190 264"/></g>`)
      const ty = 500
      out.push(`<path d="M170 ${ty} L1030 ${ty}" stroke="#a1a1aa" stroke-opacity="0.25" stroke-width="1.5"/>`)
      for (let i = 0; i < 12; i++) {
        const x = 190 + i * 36
        out.push(`<circle cx="${x}" cy="${ty}" r="5" fill="#a78bfa" fill-opacity="${n(0.25 + i * 0.04)}"/>`)
      }
      for (let i = 0; i < 30; i++) {
        const x = 640 + i * 13
        out.push(`<rect x="${x - 1.5}" y="${ty - 9}" width="3" height="18" rx="1.5" fill="url(#sweep)" fill-opacity="${n(0.3 + (i / 29) * 0.7)}"/>`)
      }
      out.push(`<circle cx="1024" cy="${ty}" r="7" fill="#f472b6" filter="url(#glow)"/>`)
      return out.join('\n')
    },
  },

  environments: {
    about: 'Three identical stacked planes (dev, preprod, prod) with a gated promotion pipeline',
    draw(rng, a) {
      const cx = 540
      const ha = 240
      const hb = 92
      const levels = [470, 318, 166]
      const layout = [[-120, 6], [-20, -26], [70, 10], [10, 34]]
      const heights = layout.map(() => rng.int(26, 52))
      const out = []
      levels.forEach((cy, i) => {
        const op = [0.5, 0.75, 1][i]
        out.push(`<path d="M${cx - ha} ${cy} L${cx} ${cy - hb} L${cx + ha} ${cy} L${cx} ${cy + hb} Z" fill="#27272a" fill-opacity="${[0.45, 0.6, 0.75][i]}" stroke="url(#sweep)" stroke-width="${[1.4, 1.8, 2.4][i]}" stroke-opacity="${op}" stroke-linejoin="round"${i === 2 ? ' filter="url(#glow)"' : ''}/>`)
        const cubes = layout
          .map(([dx, dy], k) => ({ x: cx + dx, y: cy + dy - 8, ht: heights[k] }))
          .sort((p, q) => p.y - q.y)
          .map((c) => isoCube(c.x, c.y - c.ht, 24, 13, c.ht, { opacity: op }))
        out.push(cubes.join('\n'))
        if (i < 2) {
          out.push(`<path d="M${cx - ha} ${cy} L${cx - ha} ${levels[i + 1]}" stroke="#a1a1aa" stroke-opacity="0.2" stroke-width="1.4" stroke-dasharray="3 7"/>`)
        }
      })
      const px = 900
      out.push(`<path d="M${px} ${levels[0]} L${px} ${levels[2]}" stroke="url(#sweep)" stroke-width="3" stroke-linecap="round"/>`)
      levels.forEach((cy, i) => {
        out.push(`<path d="M${cx + ha + 14} ${cy} L${px - 22} ${cy}" stroke="url(#sweep)" stroke-opacity="0.55" stroke-width="1.8" stroke-dasharray="2 8" stroke-linecap="round"/>`)
        const glow = i === 2 ? ' filter="url(#glow)"' : ''
        out.push(`<circle cx="${px}" cy="${cy}" r="${[11, 13, 16][i]}" fill="${i === 2 ? a.hi : '#27272a'}" stroke="url(#sweep)" stroke-width="2.4"${glow}/>`)
      })
      for (const y of [400, 248]) {
        out.push(`<path d="M${px - 8} ${y + 5} L${px} ${y - 4} L${px + 8} ${y + 5}" fill="none" stroke="#f4f4f5" stroke-opacity="0.8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`)
      }
      out.push(`<path d="M${px - 26} 214 L${px + 26} 214" stroke="#f472b6" stroke-width="4" stroke-linecap="round" filter="url(#glow)"/>`)
      return out.join('\n')
    },
  },

  iac: {
    about: 'A declared grid of infrastructure (some still planned) configured from a central playbook',
    draw(rng, a) {
      const out = []
      const hub = { x: CX, y: 118 }
      out.push(`<g filter="url(#glow)"><rect x="${hub.x - 82}" y="${hub.y - 50}" width="164" height="100" rx="14" fill="#1c1c22" stroke="url(#sweep)" stroke-width="2.4"/></g>`)
      const bars = [[0, 70], [16, 58], [16, 40], [0, 64], [16, 50]]
      bars.forEach(([ind, len], i) => {
        out.push(`<rect x="${hub.x - 60 + ind}" y="${hub.y - 34 + i * 15}" width="${len}" height="6" rx="3" fill="${i === 0 ? a.hi : '#a1a1aa'}" fill-opacity="${i === 0 ? 0.95 : 0.5}"/>`)
      })
      const dx = 82
      const dy = 47
      const cells = []
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) cells.push({ i, j, x: CX + (i - j) * dx, y: 300 + (i + j) * dy })
      const planned = new Set()
      while (planned.size < 2) planned.add(rng.int(0, 8))
      cells.forEach((c, k) => (c.planned = planned.has(k)))
      cells.forEach((c) => {
        if (c.planned) return
        out.push(`<path d="M${hub.x} ${hub.y + 50} C ${hub.x} ${n(hub.y + 120)}, ${n(c.x)} ${n(c.y - 120)}, ${n(c.x)} ${n(c.y - 52)}" fill="none" stroke="url(#sweep)" stroke-opacity="0.4" stroke-width="1.6"/>`)
      })
      out.push(`<path d="M${CX} ${300 - 60} L${CX + 3 * dx} ${300 - 60 + 3 * dy} L${CX} ${300 - 60 + 6 * dy} L${CX - 3 * dx} ${300 - 60 + 3 * dy} Z" fill="#7c3aed" fill-opacity="0.05" stroke="#a1a1aa" stroke-opacity="0.22" stroke-width="1.4" stroke-dasharray="4 8"/>`)
      cells
        .sort((p, q) => p.y - q.y)
        .forEach((c) => {
          const ht = 40
          out.push(c.planned ? isoCube(c.x, c.y - ht, 44, 25, ht, { fill: false, dashed: true, opacity: 0.6 }) : isoCube(c.x, c.y - ht, 44, 25, ht))
          if (!c.planned) out.push(`<circle cx="${n(c.x)}" cy="${n(c.y - ht)}" r="4" fill="#f4f4f5" fill-opacity="0.85"/>`)
        })
      return out.join('\n')
    },
  },

  terminal: {
    about: 'A shell window speaking to a remote host through a sealed, self-healing channel',
    draw(rng, a) {
      const out = []
      const wx = 170
      const wy = 160
      const ww = 390
      const wh = 310
      out.push(`<g filter="url(#glow)"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="16" fill="#141418" stroke="url(#sweep)" stroke-width="2.4"/></g>`)
      out.push(`<path d="M${wx} ${wy + 40} L${wx + ww} ${wy + 40}" stroke="#3f3f46" stroke-width="1.5"/>`)
      ;['#3f3f46', '#52525b', '#71717a'].forEach((c, i) => out.push(`<circle cx="${wx + 24 + i * 20}" cy="${wy + 20}" r="6" fill="${c}"/>`))
      let y = wy + 78
      for (let line = 0; line < 6; line++) {
        const isPrompt = line === 0 || line === 3
        let x = wx + 26
        if (isPrompt) {
          out.push(`<path d="M${x} ${y - 8} L${x + 10} ${y} L${x} ${y + 8}" fill="none" stroke="${a.hi}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`)
          x += 24
        } else x += 12
        const segs = rng.int(2, 4)
        for (let s = 0; s < segs; s++) {
          const len = rng.int(24, 76)
          if (x + len > wx + ww - 30) break
          const fill = isPrompt && s === 0 ? '#f4f4f5' : '#a1a1aa'
          out.push(`<rect x="${x}" y="${y - 4}" width="${len}" height="8" rx="4" fill="${fill}" fill-opacity="${isPrompt ? 0.85 : 0.4}"/>`)
          x += len + 10
        }
        y += 34
      }
      out.push(`<path d="M${wx + 26} ${y - 8} L${wx + 36} ${y} L${wx + 26} ${y + 8}" fill="none" stroke="${a.hi}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`)
      out.push(`<rect x="${wx + 48}" y="${y - 10}" width="12" height="20" rx="2" fill="${a.hi}" filter="url(#glow)"/>`)

      const hx = 820
      const hy = 190
      out.push(`<rect x="${hx}" y="${hy}" width="200" height="250" rx="16" fill="#1c1c22" stroke="url(#sweep)" stroke-width="2.4"/>`)
      for (let s = 0; s < 4; s++) {
        const sy = hy + 30 + s * 54
        out.push(`<rect x="${hx + 22}" y="${sy}" width="156" height="34" rx="8" fill="#27272a" stroke="#3f3f46" stroke-width="1.4"/>`)
        out.push(`<circle cx="${hx + 44}" cy="${sy + 17}" r="5" fill="${s === 1 ? '#f472b6' : '#a78bfa'}" fill-opacity="${s === 1 ? 1 : 0.6}"/>`)
        out.push(`<rect x="${hx + 62}" y="${sy + 13}" width="${rng.int(50, 96)}" height="8" rx="4" fill="#a1a1aa" fill-opacity="0.35"/>`)
      }

      const t0 = wx + ww
      const t1 = hx
      const gap = [668, 708]
      const pipe = (x0, x1) => `<path d="M${x0} 300 L${x1} 300 M${x0} 330 L${x1} 330" stroke="url(#sweep)" stroke-width="2.4" stroke-linecap="round"/>`
      out.push(pipe(t0, gap[0]), pipe(gap[1], t1))
      for (const x of [600, 640, 740, 780]) {
        out.push(`<ellipse cx="${x}" cy="315" rx="7" ry="22" fill="none" stroke="url(#sweep)" stroke-width="2.2"/>`)
      }
      out.push(`<rect x="612" y="309" width="18" height="12" rx="6" fill="#f4f4f5" fill-opacity="0.9"/><rect x="750" y="309" width="18" height="12" rx="6" fill="${a.hi}" filter="url(#glow)"/>`)
      out.push(`<path d="M${gap[0] - 6} 288 C ${gap[0]} 236, ${gap[1]} 236, ${gap[1] + 6} 288" fill="none" stroke="#f472b6" stroke-width="2.4" stroke-dasharray="2 7" stroke-linecap="round"/><path d="M${gap[1] - 3} 278 L${gap[1] + 6} 289 L${gap[1] + 14} 277" fill="none" stroke="#f472b6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`)
      return out.join('\n')
    },
  },

  ast: {
    about: 'Obfuscated noise resolving into a syntax tree, dead branches faded and suspicious leaves flagged',
    draw(rng, a) {
      const out = []
      out.push(`<path d="M820 70 C 1090 150, 1110 430, 900 575" fill="none" stroke="url(#sweep)" stroke-opacity="0.12" stroke-width="22" stroke-linecap="round"/>`)
      const root = { depth: 0, children: [] }
      const grow = (node, depth) => {
        if (depth >= 4) return
        const kids = depth === 0 ? 3 : rng.int(depth >= 3 ? 1 : 2, 3)
        for (let k = 0; k < kids; k++) {
          const child = { depth: depth + 1, children: [], dead: node.dead || (depth >= 1 && rng() < 0.16) }
          node.children.push(child)
          if (depth < 3 && rng() < 0.85) grow(child, depth + 1)
        }
      }
      grow(root, 0)
      const leaves = []
      const collect = (nd) => (nd.children.length ? nd.children.forEach(collect) : leaves.push(nd))
      collect(root)
      const y0 = 110
      const y1 = 520
      leaves.forEach((l, i) => (l.y = y0 + ((y1 - y0) * (i + 0.5)) / leaves.length))
      const place = (nd) => {
        nd.x = 390 + nd.depth * 150
        if (nd.children.length) {
          nd.children.forEach(place)
          nd.y = nd.children.reduce((s, c) => s + c.y, 0) / nd.children.length
        }
      }
      place(root)
      const edges = []
      const nodes = []
      let flags = 0
      const walk = (nd) => {
        for (const c of nd.children) {
          const mx = (nd.x + c.x) / 2
          const style = c.dead ? 'stroke-opacity="0.22" stroke-dasharray="3 7"' : 'stroke-opacity="0.7"'
          edges.push(`<path d="M${n(nd.x)} ${n(nd.y)} C ${n(mx)} ${n(nd.y)}, ${n(mx)} ${n(c.y)}, ${n(c.x)} ${n(c.y)}" fill="none" stroke="url(#sweep)" stroke-width="2" ${style}/>`)
          walk(c)
        }
        const leaf = !nd.children.length
        if (leaf && !nd.dead && flags < 3 && rng() < 0.3) {
          flags++
          nodes.push(`<circle cx="${n(nd.x)}" cy="${n(nd.y)}" r="13" fill="none" stroke="#f472b6" stroke-width="2.4" filter="url(#glow)"/><circle cx="${n(nd.x)}" cy="${n(nd.y)}" r="5" fill="#f472b6"/>`)
        } else {
          const r = nd.depth === 0 ? 14 : leaf ? 5 : 7
          const fill = nd.depth === 0 ? a.hi : nd.dead ? '#18181b' : '#27272a'
          const op = nd.dead ? 0.3 : 1
          nodes.push(`<circle cx="${n(nd.x)}" cy="${n(nd.y)}" r="${r}" fill="${fill}" stroke="url(#sweep)" stroke-width="2" opacity="${op}"${nd.depth === 0 ? ' filter="url(#glow)"' : ''}/>`)
        }
      }
      walk(root)
      const noise = []
      for (let row = 0; row < 16; row++) {
        const y = 140 + row * 23
        let x = 140 + rng.range(0, 16)
        while (x < 330) {
          const len = rng.pick([6, 6, 10, 14, 20, 28])
          const t = (x - 140) / 190
          const op = n(0.55 - t * 0.35)
          const fill = rng() < 0.12 ? '#f472b6' : '#a1a1aa'
          noise.push(`<rect x="${n(x)}" y="${y - 3}" width="${len}" height="6" rx="3" fill="${fill}" fill-opacity="${op}"/>`)
          x += len + rng.range(5, 12)
        }
      }
      for (const yy of [190, 260, 370, 440]) {
        edges.push(`<path d="M335 ${yy} C 360 ${yy}, 360 ${n(root.y)}, ${n(root.x)} ${n(root.y)}" fill="none" stroke="#a1a1aa" stroke-opacity="0.3" stroke-width="1.5"/>`)
      }
      return noise.join('') + '\n' + edges.join('\n') + '\n' + nodes.join('\n')
    },
  },

  records: {
    about: 'A config file with one delimited, managed block mapped out to hosts, snapshots stacked behind',
    draw(rng, a) {
      const out = []
      const dx = 250
      const dy = 110
      const dw = 360
      const dh = 420
      for (let k = 2; k >= 1; k--) {
        out.push(`<rect x="${dx - k * 22}" y="${dy + k * 18}" width="${dw}" height="${dh}" rx="16" fill="#1a1a20" stroke="url(#sweep)" stroke-width="1.6" stroke-opacity="${n(0.5 - k * 0.15)}"/>`)
      }
      out.push(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="16" fill="#141418" stroke="url(#sweep)" stroke-width="2.4"/>`)
      const bt = dy + 150
      const bb = dy + 330
      const line = (y, w, op, fill = '#a1a1aa') => `<rect x="${dx + 30}" y="${y - 4}" width="${w}" height="8" rx="4" fill="${fill}" fill-opacity="${op}"/>`
      for (const y of [dy + 40, dy + 70, dy + 100]) out.push(line(y, rng.int(120, 220), 0.3))
      for (const y of [dy + dh - 50]) out.push(line(y, rng.int(120, 200), 0.3))
      out.push(`<rect x="${dx + 16}" y="${bt - 18}" width="${dw - 32}" height="${bb - bt + 36}" rx="10" fill="#7c3aed" fill-opacity="0.12"/>`)
      out.push(`<g filter="url(#glow)" fill="none" stroke="${a.hi}" stroke-width="2.6" stroke-linecap="round"><path d="M${dx + 16} ${bt - 6} L${dx + 16} ${bt - 18} L${dx + dw - 16} ${bt - 18} L${dx + dw - 16} ${bt - 6}"/><path d="M${dx + 16} ${bb + 6} L${dx + 16} ${bb + 18} L${dx + dw - 16} ${bb + 18} L${dx + dw - 16} ${bb + 6}"/></g>`)
      const rows = []
      for (let y = bt + 14; y <= bb - 10; y += 34) rows.push(y)
      const hosts = rows.map((_, i) => ({ x: 900, y: 150 + (i * 330) / Math.max(1, rows.length - 1) }))
      rows.forEach((y, i) => {
        out.push(`<rect x="${dx + 30}" y="${y - 4}" width="64" height="8" rx="4" fill="#f4f4f5" fill-opacity="0.8"/>`)
        out.push(`<rect x="${dx + 106}" y="${y - 4}" width="${rng.int(90, 150)}" height="8" rx="4" fill="url(#sweep)" fill-opacity="0.75"/>`)
        out.push(`<path d="M${dx + dw + 4} ${y} C ${dx + dw + 120} ${y}, ${hosts[i].x - 140} ${n(hosts[i].y)}, ${hosts[i].x - 24} ${n(hosts[i].y)}" fill="none" stroke="url(#sweep)" stroke-opacity="0.5" stroke-width="1.8"/>`)
        const hot = i === 1
        out.push(`<rect x="${hosts[i].x - 24}" y="${n(hosts[i].y - 18)}" width="48" height="36" rx="9" fill="${hot ? a.hi : '#1c1c22'}" fill-opacity="${hot ? 0.9 : 1}" stroke="url(#sweep)" stroke-width="2"${hot ? ' filter="url(#glow)"' : ''}/>`)
      })
      return out.join('\n')
    },
  },

  topology: {
    about: 'Internet to an HA edge pair, an inspection hop, and segmented zones for app, database, and storage',
    draw(rng, a) {
      const out = []
      const g = { x: 200, y: 315 }
      const globe = `<g fill="none" stroke="url(#sweep)" stroke-width="2"><circle cx="${g.x}" cy="${g.y}" r="50" fill="#18181b"/><circle cx="${g.x}" cy="${g.y}" r="50"/><ellipse cx="${g.x}" cy="${g.y}" rx="22" ry="50"/><path d="M${g.x - 50} ${g.y} L${g.x + 50} ${g.y} M${g.x - 43} ${g.y - 25} L${g.x + 43} ${g.y - 25} M${g.x - 43} ${g.y + 25} L${g.x + 43} ${g.y + 25}" stroke-opacity="0.6"/></g>`
      const routers = [{ x: 380, y: 230 }, { x: 380, y: 400 }]
      const fw = { x: 545, y: 315 }
      const link = (p, q, extra = '') => `<path d="M${p.x} ${p.y} L${q.x} ${q.y}" stroke="url(#sweep)" stroke-width="2" stroke-opacity="0.6"${extra}/>`
      routers.forEach((r) => out.push(link(g, r), link(r, fw)))
      out.push(globe)
      out.push(`<path d="M380 262 L380 368" stroke="#f472b6" stroke-width="2.2" stroke-dasharray="2 7" stroke-linecap="round"/>`)
      routers.forEach((r, i) => {
        const glow = i === 0 ? ' filter="url(#glow)"' : ''
        out.push(`<g${glow}><rect x="${r.x - 30}" y="${r.y - 30}" width="60" height="60" rx="14" fill="#1c1c22" stroke="url(#sweep)" stroke-width="2.4"/></g><path d="M${r.x - 14} ${r.y - 6} L${r.x + 14} ${r.y - 6} M${r.x + 6} ${r.y - 13} L${r.x + 14} ${r.y - 6} L${r.x + 6} ${r.y + 1} M${r.x + 14} ${r.y + 8} L${r.x - 14} ${r.y + 8} M${r.x - 6} ${r.y + 1} L${r.x - 14} ${r.y + 8} L${r.x - 6} ${r.y + 15}" fill="none" stroke="${i === 0 ? a.hi : '#a1a1aa'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`)
      })
      const hex = []
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 3) * k
        hex.push(`${n(fw.x + 40 * Math.cos(ang))} ${n(fw.y + 40 * Math.sin(ang))}`)
      }
      out.push(`<g filter="url(#glow)"><path d="M${hex.join(' L')} Z" fill="#1c1c22" stroke="url(#sweep)" stroke-width="2.6"/></g><circle cx="${fw.x}" cy="${fw.y}" r="10" fill="${a.hi}"/>`)
      const zones = [
        { y: 110, h: 130 },
        { y: 260, h: 110 },
        { y: 390, h: 130 },
      ]
      const zx = 700
      const zw = 320
      zones.forEach((z, i) => {
        const my = z.y + z.h / 2
        out.push(`<path d="M${fw.x + 40} ${fw.y} C ${fw.x + 90} ${fw.y}, ${zx - 60} ${my}, ${zx} ${my}" fill="none" stroke="url(#sweep)" stroke-width="2" stroke-opacity="0.6"/>`)
        out.push(`<rect x="${zx}" y="${z.y}" width="${zw}" height="${z.h}" rx="18" fill="#7c3aed" fill-opacity="0.05" stroke="url(#sweep)" stroke-width="1.6" stroke-dasharray="4 8" stroke-linecap="round"/>`)
        const ccx = zx + zw / 2
        if (i === 0) {
          for (const dx of [-70, 70]) {
            out.push(`<rect x="${ccx + dx - 48}" y="${my - 30}" width="96" height="60" rx="10" fill="#1c1c22" stroke="url(#sweep)" stroke-width="2"/>`)
            for (let s = 0; s < 3; s++) out.push(`<rect x="${ccx + dx - 34}" y="${my - 18 + s * 14}" width="${rng.int(36, 68)}" height="6" rx="3" fill="#a1a1aa" fill-opacity="0.45"/>`)
          }
        } else if (i === 1) {
          out.push(cylinder(ccx, my - 30, 46, 13, 58, 3))
        } else {
          out.push(`<g stroke="url(#sweep)" stroke-width="2"><path d="M${ccx - 50} ${my - 36} L${ccx - 38} ${my + 36} Q${ccx} ${my + 48} ${ccx + 38} ${my + 36} L${ccx + 50} ${my - 36} Z" fill="url(#face)"/><ellipse cx="${ccx}" cy="${my - 36}" rx="50" ry="13" fill="#2a2a33"/></g>`)
        }
      })
      return out.join('\n')
    },
  },
}

function render(slug, motif, seed, accentName) {
  const rng = makeRng(hashSeed(`${slug}:${seed}`))
  const accent = ACCENTS[accentName]
  const body = motifs[motif].draw(rng, accent)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs(accent)}
${background(rng)}
${body}
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
${seriesMark()}
</svg>
`
}

function has(cmd) {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function rasterize(svgPath, pngPath) {
  execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', pngPath, svgPath])
  const magick = has('magick') ? 'magick' : has('convert') ? 'convert' : null
  if (magick) {
    const tmp = `${pngPath}.q.png`
    execFileSync(magick, [pngPath, '-strip', '-dither', 'Riemersma', '-colors', '256', `PNG8:${tmp}`])
    renameSync(tmp, pngPath)
  }
  if (has('optipng')) execFileSync('optipng', ['-quiet', '-o2', pngPath])
  return statSync(pngPath).size
}

function usage(code) {
  const list = Object.entries(motifs).map(([k, v]) => `  ${k.padEnd(13)} ${v.about}`).join('\n')
  console.log(`usage: node scripts/make-cover.mjs <slug> --motif <name> [--seed <n>] [--accent blue|purple|pink] [--no-png]

motifs:
${list}`)
  process.exit(code)
}

const args = process.argv.slice(2)
if (args.includes('--list') || args.includes('-h') || args.includes('--help')) usage(0)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const slug = args.find((x, i) => !x.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--no-png'))
const motif = opt('motif')
const seed = opt('seed', '1')
const accent = opt('accent', 'purple')
if (!slug || !/^[a-z0-9-]+$/.test(slug)) usage(1)
if (!motifs[motif]) {
  console.error(`unknown motif: ${motif}`)
  usage(1)
}
if (!ACCENTS[accent]) {
  console.error(`unknown accent: ${accent}`)
  usage(1)
}

mkdirSync(OUT_DIR, { recursive: true })
const svgPath = join(OUT_DIR, `${slug}.svg`)
writeFileSync(svgPath, render(slug, motif, seed, accent))
console.log(`${svgPath} (${statSync(svgPath).size} B)`)
if (!args.includes('--no-png')) {
  const pngPath = join(OUT_DIR, `${slug}.png`)
  rmSync(pngPath, { force: true })
  console.log(`${pngPath} (${rasterize(svgPath, pngPath)} B)`)
}
