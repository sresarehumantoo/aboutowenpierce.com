'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

interface CubeProps {
  position: [number, number, number]
  baseColor: string
}

function Cube({ position, baseColor }: CubeProps) {
  const materials = useMemo(() => {
    const base = new THREE.Color(baseColor)
    const lighter = base.clone().lerp(new THREE.Color('#ffffff'), 0.35)
    const darker = base.clone().lerp(new THREE.Color('#000000'), 0.3)

    return [
      new THREE.MeshBasicMaterial({ color: base }),     // +X right
      new THREE.MeshBasicMaterial({ color: darker }),   // -X left
      new THREE.MeshBasicMaterial({ color: lighter }),  // +Y top
      new THREE.MeshBasicMaterial({ color: darker }),   // -Y bottom
      new THREE.MeshBasicMaterial({ color: base }),     // +Z front
      new THREE.MeshBasicMaterial({ color: darker }),   // -Z back
    ]
  }, [baseColor])

  return (
    <mesh position={position} material={materials}>
      <boxGeometry args={[0.75, 0.75, 0.75]} />
    </mesh>
  )
}

interface CubeGroupProps {
  isSpinning: boolean
  isDark: boolean
  onSpinComplete: () => void
}

// Starting rotation (slightly angled view)
const START_ROTATION = { x: Math.PI / 6, y: -Math.PI / 4 }

function CubeGroup({ isSpinning, isDark, onSpinComplete }: CubeGroupProps) {
  const groupRef = useRef<THREE.Group>(null)
  const spinStartTime = useRef(0)
  const spinDuration = 1.0
  const currentRotation = useRef({ x: START_ROTATION.x, y: START_ROTATION.y })
  const invalidate = useThree((s) => s.invalidate)

  // Gradient colors - grey/white on bottom, colors on top
  // Light mode: white/grey bottom -> blue top
  const lightGradient = [
    '#e2e8f0', // slate-200 (bottom back)
    '#cbd5e1', // slate-300
    '#f1f5f9', // slate-100
    '#e2e8f0', // slate-200
    '#3b82f6', // blue-500 (top back)
    '#2563eb', // blue-600
    '#60a5fa', // blue-400
    '#3b82f6', // blue-500 (top front)
  ]

  // Dark mode: grey bottom -> purple top
  const darkGradient = [
    '#52525b', // zinc-600 (bottom back)
    '#71717a', // zinc-500
    '#3f3f46', // zinc-700
    '#52525b', // zinc-600
    '#7c3aed', // violet-600 (top back)
    '#6d28d9', // violet-700
    '#8b5cf6', // violet-500
    '#7c3aed', // violet-600 (top front)
  ]

  const gradientColors = isDark ? darkGradient : lightGradient

  useEffect(() => {
    if (isSpinning) {
      spinStartTime.current = Date.now()
      invalidate()
    }
  }, [isSpinning, invalidate])

  // Repaint when the gradient swaps (theme change) — frameloop="demand" needs an
  // explicit invalidate, otherwise the cube keeps its old colors until next spin.
  useEffect(() => {
    invalidate()
  }, [isDark, invalidate])

  useFrame(() => {
    if (!groupRef.current) return

    if (isSpinning) {
      const elapsed = (Date.now() - spinStartTime.current) / 1000
      const progress = Math.min(elapsed / spinDuration, 1)

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3)

      // Full rotation plus return to start position
      const fullRotation = Math.PI * 2
      groupRef.current.rotation.x = START_ROTATION.x + fullRotation * eased
      groupRef.current.rotation.y = START_ROTATION.y + fullRotation * eased

      if (progress >= 1) {
        // Snap back to exact start rotation
        groupRef.current.rotation.x = START_ROTATION.x
        groupRef.current.rotation.y = START_ROTATION.y
        onSpinComplete()
      } else {
        invalidate()
      }
    }
  })

  // 2x2x2 cube array - 8 cubes total
  const spacing = 0.55

  // Cubes: bottom layer (indices 0-3), top layer (indices 4-7)
  const cubes: { pos: [number, number, number]; colorIdx: number }[] = [
    // Bottom layer (grey/white)
    { pos: [-spacing, -spacing, -spacing], colorIdx: 0 },
    { pos: [spacing, -spacing, -spacing], colorIdx: 1 },
    { pos: [-spacing, -spacing, spacing], colorIdx: 2 },
    { pos: [spacing, -spacing, spacing], colorIdx: 3 },
    // Top layer (blue/purple)
    { pos: [-spacing, spacing, -spacing], colorIdx: 4 },
    { pos: [spacing, spacing, -spacing], colorIdx: 5 },
    { pos: [-spacing, spacing, spacing], colorIdx: 6 },
    { pos: [spacing, spacing, spacing], colorIdx: 7 },
  ]

  return (
    <group ref={groupRef} rotation={[START_ROTATION.x, START_ROTATION.y, 0]}>
      {cubes.map((cube, i) => (
        <Cube key={i} position={cube.pos} baseColor={gradientColors[cube.colorIdx]} />
      ))}
    </group>
  )
}

interface Logo3DProps {
  isDark: boolean
  isSpinning: boolean
  onSpinComplete: () => void
}

export function Logo3D({ isDark, isSpinning, onSpinComplete }: Logo3DProps) {
  return (
    <div className="logo-3d-container">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 35 }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <CubeGroup
          isSpinning={isSpinning}
          isDark={isDark}
          onSpinComplete={onSpinComplete}
        />
      </Canvas>
    </div>
  )
}
