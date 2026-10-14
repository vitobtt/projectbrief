// Estado compartido entre GSAP (que lo anima) y la escena 3D (que lo lee en
// cada frame). Son objetos mutables a propósito: así ni el scroll ni las
// animaciones provocan re-renders de React.

// La pose del cohete. El scroll la va llevando de una sección a la siguiente.
export const rig = {
  // Fracción de media pantalla: -1 es el borde izquierdo y 1 el derecho
  x: 0,
  // Altura en unidades de mundo (la pantalla va de -2,18 a 2,18)
  y: 0,
  // Inclinación hacia la cámara y giro en el plano de la pantalla
  rotX: 0,
  rotZ: 0,
  scale: 1,
  // Grietas: 0 = intacto, 1 = a punto de reventar
  damage: 0,
  // Explosión final: 0 = entero, 1 = hecho pedazos
  explode: 0,
  // Progreso total del scroll, de 0 a 1
  progress: 0,
}

// El intento de despegue.
export const launch = {
  // Avance a lo largo del morro, en alturas de cohete
  lift: 0,
  thrust: 0,
  shake: 0,
  // Vuelve a intentarlo (lo asigna la página, lo llama el cohete al hacer clic)
  retry: undefined as undefined | (() => void),
}
