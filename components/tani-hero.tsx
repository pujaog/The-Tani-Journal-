'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import { Feather, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'

type TaniHeroProps = { onStart: () => void; onExplore: () => void }

function OpenBook({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<Group>(null)
  const leftPage = useRef<Mesh>(null)
  const rightPage = useRef<Mesh>(null)
  useFrame(({ clock, pointer }) => {
    if (!group.current) return
    const time = clock.getElapsedTime()
    group.current.rotation.y = reducedMotion ? -0.18 : time * 0.12 + pointer.x * 0.12
    group.current.rotation.x = reducedMotion ? -0.08 : -0.08 + pointer.y * 0.06
    if (leftPage.current && rightPage.current && !reducedMotion) {
      leftPage.current.rotation.z = -0.08 + Math.sin(time * 0.8) * 0.015
      rightPage.current.rotation.z = 0.08 - Math.sin(time * 0.8) * 0.015
    }
  })
  return <group ref={group} rotation={[-0.08, -0.18, 0]}>
    <mesh ref={leftPage} position={[-0.9, 0, 0]} rotation={[0, -0.08, -0.08]}><boxGeometry args={[1.65, 0.08, 2.3]} /><meshStandardMaterial color="#f5ead5" roughness={0.8} /></mesh>
    <mesh ref={rightPage} position={[0.9, 0, 0]} rotation={[0, 0.08, 0.08]}><boxGeometry args={[1.65, 0.08, 2.3]} /><meshStandardMaterial color="#fffaf0" roughness={0.8} /></mesh>
    <mesh position={[0, -0.1, 0]}><boxGeometry args={[0.12, 0.18, 2.35]} /><meshStandardMaterial color="#b46c4b" roughness={0.65} /></mesh>
    <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.65, 0.018, 8, 32, Math.PI]} /><meshStandardMaterial color="#b46c4b" /></mesh>
  </group>
}

export function TaniHero({ onStart, onExplore }: TaniHeroProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_75%_30%,#e8c7a4_0,#d9e2d4_35%,#f4f0e8_72%)] px-5 py-16 text-stone-900 sm:py-24"><div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]"><div className="relative z-10"><p className="mb-5 text-xs uppercase tracking-[0.3em] text-stone-600">A journal for the unfinished thought</p><h1 className="max-w-3xl font-serif text-6xl leading-[0.95] tracking-tight sm:text-8xl">The Tani Journal</h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-600 sm:text-xl">Write what matters. Shape it into a story. Keep your words close, or let them travel.</p><div className="mt-9 flex flex-wrap gap-3"><button onClick={onStart} className="inline-flex items-center gap-2 bg-stone-900 px-5 py-3 text-sm text-white"><Feather className="h-4 w-4" /> Start writing</button><button onClick={onExplore} className="inline-flex items-center gap-2 border border-stone-400 px-5 py-3 text-sm"><Globe className="h-4 w-4" /> Explore stories</button></div></div><div className="h-[22rem] sm:h-[30rem]" aria-label="A floating open book made of pages"><Canvas camera={{ position: [0, 1, 5.5], fov: 38 }} dpr={[1, 2]}><ambientLight intensity={1.8} /><directionalLight position={[3, 5, 4]} intensity={3} color="#fff4df" /><directionalLight position={[-4, 2, -2]} intensity={1.5} color="#b7d4c1" /><Float enabled={!reducedMotion} speed={1.2} rotationIntensity={0.12} floatIntensity={0.3}><OpenBook reducedMotion={reducedMotion} /></Float><OrbitControls enableZoom={false} enablePan={false} enableRotate={false} /></Canvas></div></div></section>
}