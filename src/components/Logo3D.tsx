'use client'

import { useEffect, useRef, type CSSProperties } from 'react'

const REST = 'rotateX(-30deg) rotateY(-45deg)'
const SPUN = 'rotateX(-390deg) rotateY(315deg)'

// [x, y, z, tone]: a 2x2x2 stack with y up; tone picks the palette entry in globals.css.
const BLOCKS = [
  [-1, -1, -1, 0],
  [1, -1, -1, 1],
  [-1, -1, 1, 2],
  [1, -1, 1, 0],
  [-1, 1, -1, 3],
  [1, 1, -1, 4],
  [-1, 1, 1, 5],
  [1, 1, 1, 3],
]

const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom']

interface Logo3DProps {
  isSpinning: boolean
  onSpinComplete: () => void
}

export function Logo3D({ isSpinning, onSpinComplete }: Logo3DProps) {
  const cubeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cube = cubeRef.current
    if (!isSpinning || !cube) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onSpinComplete()
      return
    }
    const spin = cube.animate([{ transform: REST }, { transform: SPUN }], {
      duration: 1000,
      easing: 'cubic-bezier(0.33, 1, 0.67, 1)',
    })
    spin.finished.then(onSpinComplete, () => {})
    return () => spin.cancel()
  }, [isSpinning, onSpinComplete])

  return (
    <div className="logo-3d-container" aria-hidden="true">
      <div className="logo-cube" ref={cubeRef}>
        {BLOCKS.map(([x, y, z, tone], i) => (
          <div
            key={i}
            className={`logo-block logo-tone-${tone}`}
            style={{ '--x': x, '--y': y, '--z': z } as CSSProperties}
          >
            {FACES.map((face) => (
              <span key={face} className={`logo-face logo-face-${face}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
