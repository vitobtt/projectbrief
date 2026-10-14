import * as THREE from "three"

// Uniforms compartidos por todos los materiales del cohete.
export const rocketUniforms = {
  uDamage: { value: 0 },
  uExplode: { value: 0 },
  uTime: { value: 0 },
  // Centro del cohete y media pantalla, ambos en unidades de mundo
  uCenter: { value: new THREE.Vector3() },
  uSpread: { value: new THREE.Vector2(4, 2) },
}

const VERTEX_HEAD = /* glsl */ `
attribute vec3 aCentroid;
attribute vec3 aRand;
uniform float uDamage;
uniform float uExplode;
uniform float uTime;
uniform vec3 uCenter;
uniform vec2 uSpread;
varying vec3 vObj;

vec3 rotateAround(vec3 v, vec3 axis, float angle) {
  return mix(dot(axis, v) * axis, v, cos(angle)) + cross(axis, v) * sin(angle);
}
`

// Cada triángulo es una pieza suelta: con el daño se separan un poco (fisuras)
// y con la explosión giran sobre sí mismas y luego se quedan meciéndose.
const VERTEX_BODY = /* glsl */ `
vObj = position;
vec3 piece = position - aCentroid;
vec3 axis = normalize(aRand - 0.5 + vec3(0.001));
float rocking = sin(uTime * (0.3 + aRand.y * 0.5) + aRand.x * 6.283) * 1.2;
piece = rotateAround(piece, axis, uExplode * (4.0 + aRand.x * 8.0 + rocking));
vec3 outward = normalize(aCentroid + vec3(0.0001));
vec3 transformed = aCentroid + piece
  + outward * smoothstep(0.55, 1.0, uDamage) * 0.04 * aRand.y;
`

// La explosión se resuelve en coordenadas de mundo: los pedazos de cada mitad
// del cohete acaban flotando junto al borde de pantalla de su lado, y dejan el
// centro libre para el contenido.
const VERTEX_PROJECT = /* glsl */ `
vec4 worldPiece = modelMatrix * vec4(transformed, 1.0);
vec3 pieceCenter = (modelMatrix * vec4(aCentroid, 1.0)).xyz;
float side = pieceCenter.x >= uCenter.x ? 1.0 : -1.0;
vec3 destination = vec3(
  side * uSpread.x * mix(0.7, 1.04, aRand.z),
  (aRand.y - 0.5) * uSpread.y * 1.9,
  (aRand.x - 0.5) * 1.6 - 0.4
);
destination.xy += 0.08 * vec2(
  sin(uTime * 0.5 + aRand.x * 6.283),
  cos(uTime * 0.4 + aRand.y * 6.283)
);
worldPiece.xyz += (destination - pieceCenter) * uExplode;
worldPiece.y += sin(3.1416 * uExplode) * (aRand.x - 0.3) * 0.9;
vec4 mvPosition = viewMatrix * worldPiece;
gl_Position = projectionMatrix * mvPosition;
`

const FRAGMENT_HEAD = /* glsl */ `
uniform float uDamage;
varying vec3 vObj;
float gCrack;

vec3 hash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453);
}

// Distancia al borde de celda de un Voronoi 3D: los bordes son las grietas.
float crackField(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 r = g + hash3(cell + g) - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}
`

// Las grietas no aparecen todas a la vez: se extienden por zonas según el daño.
const FRAGMENT_CRACK = /* glsl */ `
float crackEdge = crackField(vObj * 2.4);
float crackWidth = 0.03 + 0.07 * uDamage;
float zone = 0.5 + 0.5 * sin(vObj.x * 1.9 + sin(vObj.y * 2.7) * 1.5 + vObj.z * 1.4);
gCrack = (1.0 - smoothstep(crackWidth * 0.4, crackWidth, crackEdge))
  * smoothstep(zone - 0.12, zone, uDamage * 1.2)
  * step(0.001, uDamage);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), gCrack);
`

// Con mucho daño las grietas se ponen al rojo antes de reventar.
const FRAGMENT_GLOW = /* glsl */ `
totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * gCrack * smoothstep(0.45, 1.0, uDamage) * 3.0;
`

function patchMaterial(shader: Parameters<THREE.Material["onBeforeCompile"]>[0]) {
  Object.assign(shader.uniforms, rocketUniforms)
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
    .replace("#include <begin_vertex>", VERTEX_BODY)
    .replace("#include <project_vertex>", VERTEX_PROJECT)
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
    .replace("#include <map_fragment>", `#include <map_fragment>\n${FRAGMENT_CRACK}`)
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>\n${FRAGMENT_GLOW}`
    )
}

// Generador pseudoaleatorio con semilla: el cohete se rompe siempre igual.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Separa la geometría en triángulos independientes y guarda, por triángulo,
// su centro y tres números aleatorios.
function shatter(geometry: THREE.BufferGeometry, rand: () => number) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const position = geo.getAttribute("position")
  const centroid = new Float32Array(position.count * 3)
  const noise = new Float32Array(position.count * 3)

  for (let i = 0; i < position.count; i += 3) {
    const center = [0, 1, 2].map(
      (axis) =>
        (position.getComponent(i, axis) +
          position.getComponent(i + 1, axis) +
          position.getComponent(i + 2, axis)) /
        3
    )
    const random = [rand(), rand(), rand()]
    for (let j = 0; j < 3; j++) {
      centroid.set(center, (i + j) * 3)
      noise.set(random, (i + j) * 3)
    }
  }

  geo.setAttribute("aCentroid", new THREE.BufferAttribute(centroid, 3))
  geo.setAttribute("aRand", new THREE.BufferAttribute(noise, 3))
  return geo
}

// Devuelve una copia del modelo lista para agrietarse y explotar, centrada en
// el origen y con altura 1 (se escala desde fuera).
export function buildRocket(source: THREE.Object3D) {
  const rand = seeded(7)
  const root = source.clone(true)

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry = shatter(mesh.geometry, rand)
    const material = (mesh.material as THREE.Material).clone()
    material.side = THREE.DoubleSide
    material.onBeforeCompile = patchMaterial
    mesh.material = material
    // Las piezas salen despedidas fuera del volumen original
    mesh.frustumCulled = false
  })

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  root.position.sub(box.getCenter(new THREE.Vector3()))

  const holder = new THREE.Group()
  holder.add(root)
  holder.scale.setScalar(1 / size.y)
  return holder
}
