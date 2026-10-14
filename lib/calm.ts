// Modo calmado: el sistema pide reducir el movimiento, así que se quitan las
// animaciones que no dependen del scroll (vibración, humo, destellos, flotar)
// y la baraja fijada.
//
// PRUEBA, no definitiva: ?prueba=revision lo fuerza para poder verlo sin
// tocar la configuración del sistema, y activa los demás arreglos de la
// revisión (foco visible y velocidad del metal líquido).

export function isReviewTrial() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("prueba") === "revision"
  )
}

export function prefersCalm() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      isReviewTrial())
  )
}
