"use client"

import * as React from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Float, Lightformer, useGLTF } from "@react-three/drei"
import * as THREE from "three"

import { launch, rig } from "@/components/scene/rig"
import { buildRocket, rocketUniforms } from "@/components/scene/rocket-model"
import { BriefObject } from "@/components/scene/brief-objects"
import { prefersCalm } from "@/lib/calm"

// Movimiento reducido: sin vibración, humo, giro continuo, fogonazo ni objetos
// flotando. El cohete sigue cambiando de pose con el scroll.
const CALM = prefersCalm()

// PRUEBA, no definitiva: con ?prueba=objetos los cuerpos que flotan detrás del
// cohete pasan a ser objetos del festival (bombillas, monedas, facturas...).
const TRIAL_OBJECTS =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("prueba") === "objetos"

const MODEL = "/models/rocket.glb"
const HEIGHT = 2.4
const COLORS = ["#7c5cff", "#22d3ee", "#ff5c2b"]
const { clamp, damp } = THREE.MathUtils

// Generador pseudoaleatorio con semilla: las partículas salen siempre igual.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const rand = seeded(42)
const FLOATERS = Array.from({ length: 18 }, (_, i) => ({
  position: [(rand() - 0.5) * 12, (rand() - 0.5) * 16 - 3, -1 - rand() * 5] as [
    number,
    number,
    number,
  ],
  scale: 0.08 + rand() * 0.2,
  speed: 0.6 + rand() * 1.4,
  kind: i % 3,
  color: COLORS[i % 5 === 4 ? 2 : i % 2],
}))

// Humo: un grupo fijo de bolas low-poly que se reciclan.
const PUFFS = Array.from({ length: 22 }, () => ({
  age: 1,
  life: 1,
  origin: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  size: 0,
}))

function Rocket() {
  const { scene } = useGLTF(MODEL, false)
  const model = React.useMemo(() => buildRocket(scene), [scene])

  const group = React.useRef<THREE.Group>(null!)
  const spin = React.useRef<THREE.Group>(null!)
  const flame = React.useRef<THREE.Group>(null!)
  const flash = React.useRef<THREE.Mesh>(null!)
  const light = React.useRef<THREE.PointLight>(null!)
  const smoke = React.useRef<THREE.Group>(null!)
  const state = React.useRef({
    ready: false,
    time: 0,
    x: 0,
    y: 0,
    spin: 0,
    puff: 0,
    budget: 0,
  })
  const nozzle = React.useMemo(() => new THREE.Vector3(), [])
  const [hovered, setHovered] = React.useState(false)

  const flameGeometry = React.useMemo(
    () =>
      new THREE.ConeGeometry(1, 1, 7).rotateX(Math.PI).translate(0, -0.5, 0),
    []
  )

  React.useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : ""
    return () => {
      document.body.style.cursor = ""
    }
  }, [hovered])

  useFrame(({ pointer, viewport }, delta) => {
    const s = state.current
    s.time += delta
    const t = s.time
    const g = group.current
    const halfWidth = viewport.width / 2

    const falling = rig.progress > 0.03
    const alive = rig.explode < 0.02

    // En ventanas apaisadas pero estrechas encoge para no tapar el texto.
    const fit =
      viewport.aspect < 1 ? 1 : clamp((viewport.aspect - 0.3) / 1.45, 0.65, 1)
    const targetX = rig.x * halfWidth
    const targetScale = rig.scale * fit

    // Primer frame: aparece ya en su sitio, subiendo desde debajo de la pantalla.
    if (!s.ready) {
      s.ready = true
      s.x = targetX
      s.y = rig.y - 2.5
      g.scale.setScalar(targetScale)
      g.rotation.z = rig.rotZ
    }

    // En caída el motor tose de vez en cuando; cuanto más roto, menos empuja.
    const cough =
      !CALM && falling && Math.sin(t * 9) + Math.sin(t * 23) > 1.1
        ? 0.45 * (1 - rig.damage * 0.6)
        : 0
    const thrust = alive ? Math.max(launch.thrust, cough) : 0
    const shake =
      alive && !CALM
        ? launch.shake +
          (falling ? 0.006 + rig.damage * 0.02 : 0) +
          (hovered ? 0.01 : 0)
        : 0

    // Pose: el scroll la marca y el cursor la desvía un poco.
    s.x = damp(s.x, targetX + pointer.x * 0.15, 4, delta)
    s.y = damp(s.y, rig.y + pointer.y * 0.1, 4, delta)
    const size = damp(g.scale.x, targetScale * (hovered ? 1.05 : 1), 6, delta)
    g.scale.setScalar(size)

    // Mientras está hecho pedazos no gira: los restos se quedan donde cayeron.
    if (alive) {
      if (!CALM) s.spin += delta * 0.3
      g.rotation.z = damp(g.rotation.z, rig.rotZ - pointer.x * 0.1, 4, delta)
      g.rotation.x = damp(g.rotation.x, rig.rotX - pointer.y * 0.1, 4, delta)
      spin.current.rotation.y = damp(
        spin.current.rotation.y,
        s.spin + pointer.x * 0.8,
        4,
        delta
      )
    }

    // El empuje lo mueve hacia donde apunta el morro, esté como esté.
    const advance = launch.lift * size
    g.position.x =
      s.x -
      Math.sin(g.rotation.z) * advance +
      (Math.sin(t * 61) + Math.sin(t * 37) * 0.6) * shake
    g.position.y =
      s.y + Math.cos(g.rotation.z) * advance + Math.sin(t * 53) * shake

    rocketUniforms.uDamage.value = rig.damage
    rocketUniforms.uExplode.value = rig.explode
    rocketUniforms.uTime.value = CALM ? 0 : t
    rocketUniforms.uCenter.value.copy(g.position)
    rocketUniforms.uSpread.value.set(halfWidth, viewport.height / 2)

    const length = thrust * 0.75 * (0.85 + 0.15 * Math.sin(t * 40))
    flame.current.visible = length > 0.02
    flame.current.scale.set(1, Math.max(length, 0.001), 1)

    // Explosión: fogonazo que crece y se apaga.
    const e = rig.explode
    flash.current.visible = !CALM && e > 0.001 && e < 0.999
    flash.current.scale.setScalar(0.3 + e * 2.4)
    ;(flash.current.material as THREE.MeshBasicMaterial).opacity =
      (1 - e) * (1 - e) * 0.7
    light.current.intensity = CALM ? 0 : Math.sin(Math.PI * e) * 140

    // Humo: sale de la tobera. En el suelo se abre hacia los lados; en caída
    // queda atrás, hacia arriba.
    flame.current.getWorldPosition(nozzle)
    s.budget +=
      alive && !CALM
        ? (thrust * 12 + (falling ? 5 + rig.damage * 16 : 0)) * delta
        : 0
    while (s.budget >= 1) {
      s.budget -= 1
      const puff = PUFFS[s.puff]
      s.puff = (s.puff + 1) % PUFFS.length
      puff.age = 0
      puff.life = 0.7 + Math.random() * 0.7
      puff.size = (0.07 + Math.random() * 0.12) * size
      puff.origin.copy(nozzle)
      if (falling) {
        puff.velocity.set(
          (Math.random() - 0.5) * 0.9,
          1 + Math.random() * 1.4,
          (Math.random() - 0.5) * 0.9
        )
      } else {
        puff.velocity.set(
          (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.1),
          0.15 + Math.random() * 0.55,
          (Math.random() - 0.5) * 0.8
        )
      }
    }
    smoke.current.children.forEach((mesh, i) => {
      const puff = PUFFS[i]
      puff.age += delta
      const p = Math.min(puff.age / puff.life, 1)
      mesh.visible = p < 1
      mesh.position.copy(puff.origin).addScaledVector(puff.velocity, puff.age)
      mesh.scale.setScalar(
        Math.max(puff.size * Math.sin(Math.PI * p) ** 0.6, 0.001)
      )
    })
  })

  return (
    <>
      <group
        ref={group}
        onPointerOver={() => setHovered(rig.explode < 0.5)}
        onPointerOut={() => setHovered(false)}
        onClick={() => {
          if (rig.explode < 0.5) launch.retry?.()
        }}
      >
        <group ref={spin} scale={HEIGHT}>
          <primitive object={model} />
        </group>
        <group ref={flame} position={[0, -HEIGHT / 2, 0]}>
          <mesh geometry={flameGeometry} scale={[0.27, 1, 0.27]}>
            <meshBasicMaterial
              color="#ff5c2b"
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
          <mesh geometry={flameGeometry} scale={[0.14, 0.7, 0.14]}>
            <meshBasicMaterial color="#ffd23f" />
          </mesh>
        </group>
        <mesh ref={flash} visible={false}>
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial
            color="#ffb347"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <pointLight ref={light} color="#ff7a2b" intensity={0} distance={12} />
      </group>

      <group ref={smoke}>
        {PUFFS.map((_, i) => (
          <mesh key={i} visible={false}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#8d8aa3" flatShading roughness={1} />
          </mesh>
        ))}
      </group>
    </>
  )
}

function Floaters() {
  const group = React.useRef<THREE.Group>(null!)

  // Al bajar por la página las partículas suben deprisa: sensación de caída.
  useFrame((_, delta) => {
    group.current.position.y = damp(
      group.current.position.y,
      CALM ? 0 : rig.progress * 9,
      3,
      delta
    )
  })

  return (
    <group ref={group}>
      {FLOATERS.map((floater, i) => (
        <Float
          key={i}
          speed={CALM ? 0 : floater.speed}
          rotationIntensity={2}
          floatIntensity={1.5}
        >
          {TRIAL_OBJECTS ? (
            <group position={floater.position} scale={floater.scale * 2.6}>
              <BriefObject kind={i} />
            </group>
          ) : (
            <mesh position={floater.position} scale={floater.scale}>
              {floater.kind === 0 && <octahedronGeometry />}
              {floater.kind === 1 && <icosahedronGeometry args={[1, 0]} />}
              {floater.kind === 2 && <boxGeometry args={[1.3, 1.3, 1.3]} />}
              <meshStandardMaterial
                color={floater.color}
                flatShading
                roughness={0.3}
                metalness={0.5}
              />
            </mesh>
          )}
        </Float>
      ))}
    </group>
  )
}

export default function Scene({
  eventSource,
}: {
  // El canvas queda detrás del contenido, así que los eventos de puntero se
  // escuchan en el contenedor de la página en lugar de en el propio canvas.
  eventSource: React.RefObject<HTMLElement>
}) {
  return (
    <Canvas
      className="max-lg:opacity-45"
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 40 }}
      eventSource={eventSource}
      eventPrefix="client"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={2.2} />
      <pointLight position={[-4, -2, 2]} intensity={40} color="#22d3ee" />
      <pointLight position={[4, 2, 2]} intensity={40} color="#7c5cff" />

      <React.Suspense fallback={null}>
        <Rocket />
      </React.Suspense>
      <Floaters />

      {/* Entorno generado por código: da reflejos sin descargar ningún HDR */}
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={4}
          position={[0, 4, 2]}
          scale={[8, 2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[-5, 0, 1]}
          scale={[2, 6, 1]}
        />
        <Lightformer form="ring" intensity={3} position={[5, 1, 2]} scale={3} />
      </Environment>
    </Canvas>
  )
}

useGLTF.preload(MODEL, false)
