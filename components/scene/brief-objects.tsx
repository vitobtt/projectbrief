"use client"

// PRUEBA, no definitiva: objetos del mundo del festival para sustituir a las
// formas geométricas que flotan detrás del cohete. Solo se usan abriendo la
// página con ?prueba=objetos (ver scene.tsx).

import * as THREE from "three"

// Generador pseudoaleatorio con semilla: el papel se arruga siempre igual.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Hunde y saca los vértices de una esfera para que parezca papel arrugado.
// Los vértices repetidos se mueven juntos para que no se abran las caras.
function crumple(geometry: THREE.BufferGeometry) {
  const rand = seeded(11)
  const factors = new Map<string, number>()
  const position = geometry.getAttribute("position")
  const vertex = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    const key = `${vertex.x.toFixed(3)},${vertex.y.toFixed(3)},${vertex.z.toFixed(3)}`
    if (!factors.has(key)) factors.set(key, 0.7 + rand() * 0.4)
    vertex.multiplyScalar(factors.get(key)!)
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

// Flecha de gráfica apuntando hacia abajo.
function arrowDown() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.18, 0.6)
  shape.lineTo(0.18, 0.6)
  shape.lineTo(0.18, -0.05)
  shape.lineTo(0.45, -0.05)
  shape.lineTo(0, -0.6)
  shape.lineTo(-0.45, -0.05)
  shape.lineTo(-0.18, -0.05)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: false,
  }).center()
}

const GEOMETRY = {
  bulbGlass: new THREE.IcosahedronGeometry(0.55, 1),
  bulbNeck: new THREE.CylinderGeometry(0.3, 0.2, 0.42, 8),
  coin: new THREE.CylinderGeometry(0.6, 0.6, 0.12, 14),
  paperBall: crumple(new THREE.IcosahedronGeometry(0.6, 1)),
  arrow: arrowDown(),
  slab: new THREE.BoxGeometry(0.9, 0.8, 0.26),
  // Medio disco tumbado: el remate redondo de la lápida
  slabTop: new THREE.CylinderGeometry(
    0.45,
    0.45,
    0.26,
    12,
    1,
    false,
    Math.PI / 2,
    Math.PI
  ).rotateX(Math.PI / 2),
  sheet: new THREE.BoxGeometry(0.8, 1.1, 0.02),
  sheetLine: new THREE.BoxGeometry(0.5, 0.05, 0.012),
}

const flat = { flatShading: true }
const MATERIAL = {
  glass: new THREE.MeshStandardMaterial({
    ...flat,
    color: "#ffe48a",
    emissive: "#ffb300",
    emissiveIntensity: 0.5,
    roughness: 0.3,
  }),
  metal: new THREE.MeshStandardMaterial({
    ...flat,
    color: "#9aa0b5",
    metalness: 0.6,
    roughness: 0.4,
  }),
  gold: new THREE.MeshStandardMaterial({
    ...flat,
    color: "#ffc94d",
    metalness: 0.8,
    roughness: 0.3,
  }),
  paper: new THREE.MeshStandardMaterial({ ...flat, color: "#eef0f5", roughness: 0.9 }),
  red: new THREE.MeshStandardMaterial({ ...flat, color: "#ff5c2b", roughness: 0.5 }),
  stone: new THREE.MeshStandardMaterial({ ...flat, color: "#8087ad", roughness: 0.9 }),
  ink: new THREE.MeshStandardMaterial({ color: "#6b7190" }),
}

export const BRIEF_KINDS = 6

// Un objeto por tipo, todos de tamaño parecido (más o menos 1 de alto).
export function BriefObject({ kind }: { kind: number }) {
  switch (kind % BRIEF_KINDS) {
    // Bombilla: la idea brillante
    case 0:
      return (
        <group>
          <mesh geometry={GEOMETRY.bulbGlass} material={MATERIAL.glass} position-y={0.2} />
          <mesh geometry={GEOMETRY.bulbNeck} material={MATERIAL.metal} position-y={-0.5} />
        </group>
      )
    // Moneda: el dinero que se fue
    case 1:
      return <mesh geometry={GEOMETRY.coin} material={MATERIAL.gold} rotation-x={1.1} />
    // Bola de papel: el plan de negocio, versión 14
    case 2:
      return <mesh geometry={GEOMETRY.paperBall} material={MATERIAL.paper} />
    // Flecha hacia abajo: la gráfica de ventas
    case 3:
      return <mesh geometry={GEOMETRY.arrow} material={MATERIAL.red} />
    // Lápida: la startup que cerró
    case 4:
      return (
        <group position-y={-0.2}>
          <mesh geometry={GEOMETRY.slab} material={MATERIAL.stone} />
          <mesh geometry={GEOMETRY.slabTop} material={MATERIAL.stone} position-y={0.4} />
        </group>
      )
    // Factura impagada
    default:
      return (
        <group>
          <mesh geometry={GEOMETRY.sheet} material={MATERIAL.paper} />
          {[0.3, 0.15, 0, -0.15].map((y) => (
            <mesh
              key={y}
              geometry={GEOMETRY.sheetLine}
              material={MATERIAL.ink}
              position={[-0.08, y, 0.012]}
            />
          ))}
          <mesh
            geometry={GEOMETRY.sheetLine}
            material={MATERIAL.red}
            position={[0.12, -0.36, 0.012]}
            rotation-z={0.25}
            scale={[0.6, 2.2, 1]}
          />
        </group>
      )
  }
}
