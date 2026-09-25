import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Lightweight cinematic backdrop: a loose particle network that drifts
// slowly. Connections are computed once at mount (nearest-neighbour), not
// per-frame — the only per-frame cost is a matrix rotation, so this stays
// cheap even on modest GPUs. No lights/shadows/postprocessing.
const COUNT = 170
const BOUNDS = { x: 11, y: 5.5, z: 4 }
const MAX_LINK_DIST = 2.6
const MAX_LINKS_PER_POINT = 3

function buildGeometry() {
  const positions = new Float32Array(COUNT * 3)
  const points = []
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() * 2 - 1) * BOUNDS.x
    const y = (Math.random() * 2 - 1) * BOUNDS.y
    const z = (Math.random() * 2 - 1) * BOUNDS.z
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    points.push(new THREE.Vector3(x, y, z))
  }

  // Nearest-neighbour edges, capped per point to keep the line count sane.
  const linePositions = []
  const linkCounts = new Array(COUNT).fill(0)
  for (let i = 0; i < COUNT; i++) {
    if (linkCounts[i] >= MAX_LINKS_PER_POINT) continue
    let bestJ = -1
    let bestD = Infinity
    for (let j = 0; j < COUNT; j++) {
      if (i === j || linkCounts[j] >= MAX_LINKS_PER_POINT) continue
      const d = points[i].distanceTo(points[j])
      if (d < bestD && d < MAX_LINK_DIST) { bestD = d; bestJ = j }
    }
    if (bestJ !== -1) {
      linePositions.push(points[i].x, points[i].y, points[i].z, points[bestJ].x, points[bestJ].y, points[bestJ].z)
      linkCounts[i]++
      linkCounts[bestJ]++
    }
  }

  const pointsGeom = new THREE.BufferGeometry()
  pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const linesGeom = new THREE.BufferGeometry()
  linesGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3))

  return { pointsGeom, linesGeom }
}

function NetworkGroup() {
  const group = useRef()
  const { pointsGeom, linesGeom } = useMemo(() => buildGeometry(), [])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.035
    group.current.rotation.x += delta * 0.008
  })

  return (
    <group ref={group}>
      <points geometry={pointsGeom}>
        <pointsMaterial size={0.08} color="#7dd3fc" transparent opacity={0.9} sizeAttenuation depthWrite={false} />
      </points>
      <lineSegments geometry={linesGeom}>
        <lineBasicMaterial color="#8b5cf6" transparent opacity={0.26} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

export default function HeroScene() {
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const webglOk = typeof window !== 'undefined' && supportsWebGL()

  if (prefersReducedMotion || !webglOk) {
    // Static fallback — same visual mood without any animation loop.
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 11], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <NetworkGroup />
      </Canvas>
    </div>
  )
}
