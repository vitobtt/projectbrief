"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import Lenis from "lenis"

import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { SiteNav } from "@/components/site-nav"
import { launch, rig } from "@/components/scene/rig"
import { isReviewTrial, prefersCalm } from "@/lib/calm"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP, ScrollTrigger)

// Segundos que tarda el scroll en alcanzar su destino tras cada gesto.
const SCROLL_SECONDS = 2

// WebGL solo existe en el navegador: la escena se carga sin SSR.
const Scene = dynamic(() => import("@/components/scene/scene"), { ssr: false })

// Una pose del cohete por sección, en el mismo orden que los paneles. El
// scroll lo lleva de una a la siguiente.
const POSES = [
  // Hero: enorme, a la derecha y cortado por el borde inferior
  { x: 0.52, y: -0.57, rotX: 0, rotZ: 0.06, scale: 1.45, damage: 0 },
  // Por qué: en diagonal en el centro, con el contenido en las cuatro esquinas
  { x: 0, y: -0.05, rotX: 0.3, rotZ: -0.87, scale: 1.1, damage: 0.22 },
  // Quién: vertical y boca abajo en el centro, con texto a ambos lados
  { x: 0, y: 0, rotX: -0.3, rotZ: -Math.PI, scale: 1.3, damage: 0.5 },
  // Programa: a la izquierda, cayendo en diagonal hacia el centro
  { x: -0.5, y: 0, rotX: -0.15, rotZ: -2.5, scale: 1.2, damage: 0.8 },
  // Entradas: arriba en el centro, a punto de reventar
  { x: 0, y: 0.8, rotX: 0, rotZ: -Math.PI, scale: 0.8, damage: 1 },
]

const MANIFESTO = [
  {
    title: "Aquí no viene ningún gurú",
    text: "Nadie te va a contar cómo facturó un millón desde un coworking en Bali. Para eso ya tienes LinkedIn, que además es gratis.",
  },
  {
    title: "Se dice «cerramos»",
    text: "Ni «pivotamos», ni «cierro una etapa», ni «agradecido por el aprendizaje». Cerramos. Con todas sus letras y su agujero en la cuenta.",
  },
  {
    title: "Nosotros tampoco nos libramos",
    text: "Montar un festival sobre el fracaso tiene todas las papeletas para acabar siendo una charla de la próxima edición. Ven antes de que pase.",
  },
]

// Cada perfil se presenta como una factura. `items` son las partidas: chistes
// sobre el arquetipo, no datos del festival.
const SPEAKERS = [
  {
    who: "Emprendedores",
    line: "Tenían misión, visión y valores. Clientes, no.",
    brings: "El producto que no compró nadie",
    items: [
      ["Logo", "2.000 €"],
      ["Validar la idea", "0 €"],
      ["Clientes", "0"],
    ],
  },
  {
    who: "Artistas",
    line: "Hicieron la obra de su vida. La vio su pareja, y por compromiso.",
    brings: "La idea brillante",
    items: [
      ["Obra de su vida", "1"],
      ["Público", "1 (su pareja)"],
      ["Aplausos", "de compromiso"],
    ],
  },
  {
    who: "Desarrolladores",
    line: "Lo reescribieron todo en el framework de moda. Dos veces.",
    brings: "La app que nunca funcionó",
    items: [
      ["Reescrituras completas", "2"],
      ["Frameworks de moda", "2"],
      ["Usuarios", "0"],
    ],
  },
  {
    who: "Empresarios",
    line: "Escalaron antes de vender. Hoy escalan en el rocódromo, para el estrés.",
    brings: "La empresa que cerró",
    items: [
      ["Ventas", "0"],
      ["Escalado", "prematuro"],
      ["Cuota del rocódromo", "al día"],
    ],
  },
]

const PROGRAM = [
  {
    title: "Primero, el hostión",
    items: [
      "Productos que no compró nadie. Ni con descuento.",
      "Empresas que cerraron, con su fiesta de inauguración y todo.",
      "Apps que nunca funcionaron. En la demo sí, claro.",
      "Ideas brillantes. Lo decía el fundador y lo decía su madre.",
    ],
  },
  {
    title: "Después, la autopsia",
    items: [
      "Qué pasó de verdad, sin la versión de LinkedIn.",
      "En qué momento lo vieron venir y miraron para otro lado.",
      "Qué harían distinto. Aparte de todo.",
    ],
  },
]

const REASONS = [
  {
    who: "Si estás montando algo",
    title: "Ven a copiar errores",
    text: "Así te ahorras cometerlos tú. O, como mínimo, sabrás cómo se llama lo que te va a pasar.",
  },
  {
    who: "Si ya te la pegaste",
    title: "Estás en casa",
    text: "Nadie te va a decir que «todo pasa por algo». Pasó porque no validaste. Y ya está.",
  },
  {
    who: "Si todo te va de lujo",
    title: "Ven igualmente",
    text: "Siéntate cerca de la salida y toma notas. Por estadística, el año que viene subes tú.",
  },
]

const panel =
  "panel relative flex min-h-svh items-center px-5 pt-32 pb-20 sm:px-10 lg:px-24"
const eyebrow =
  "reveal mb-4 text-xs font-semibold tracking-[0.18em] text-cyan-400 uppercase"
const heading =
  "reveal text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl"
const headingSide =
  "reveal text-4xl leading-[1.08] font-semibold tracking-tight text-balance 2xl:text-5xl"
const lead = "reveal mt-5 text-lg leading-relaxed text-muted-foreground"
// El efecto de cristal líquido de "glass-card" está en globals.css.
const card = "glass-card reveal rounded-2xl px-6 py-5"

// Tres columnas: texto a los lados y un hueco central para el cohete.
const trio = "grid w-full gap-x-8 gap-y-6 lg:grid-cols-[1fr_1.1fr_1fr]"
// Dónde va cada tarjeta del manifiesto: las tres esquinas que deja el titular.
const CORNERS = [
  "lg:col-start-3 lg:row-start-1 lg:self-start",
  "lg:col-start-1 lg:row-start-2 lg:self-end",
  "lg:col-start-3 lg:row-start-2 lg:self-end",
]

// Posición de una tarjeta según su puesto en el mazo (0 = arriba del todo):
// las de detrás asoman por abajo, algo más pequeñas y un poco giradas.
function deckSlot(place: number) {
  return {
    xPercent: 0,
    y: place * 16,
    scale: 1 - place * 0.05,
    rotate: place === 0 ? 0 : place % 2 ? 2.5 : -2,
  }
}

// Monta la baraja: fija la sección y, en cada tramo de scroll, la tarjeta de
// arriba sale por la derecha y vuelve al fondo mientras las demás suben un
// puesto. Devuelve el ScrollTrigger que fija la sección.
function shuffleDeck() {
  const cards = gsap.utils.toArray<HTMLElement>(".deck-card")
  const faces = cards.map((card) => card.querySelector(".deck-face"))
  const last = cards.length - 1

  cards.forEach((card, place) =>
    gsap.set(card, {
      ...deckSlot(place),
      zIndex: cards.length - place,
      transformOrigin: "50% 100%",
    })
  )
  // Solo se lee la tarjeta de arriba; el cristal de las demás va vacío.
  gsap.set(faces.slice(1), { autoAlpha: 0 })

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: "#ponentes",
      start: "top top",
      end: () => `+=${window.innerHeight * 0.7 * last}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  })

  let order = cards.map((_, i) => i)
  for (let step = 0; step < last; step++) {
    const [top, ...rest] = order
    timeline
      .to(
        cards[top],
        { xPercent: 112, y: -10, rotate: 14, duration: 0.5, ease: "power2.in" },
        step
      )
      .to(faces[top], { autoAlpha: 0, duration: 0.25 }, step + 0.3)
      .set(cards[top], { zIndex: 0 }, step + 0.5)
      .to(
        cards[top],
        { ...deckSlot(last), duration: 0.5, ease: "power2.out" },
        step + 0.5
      )
      .to(faces[rest[0]], { autoAlpha: 1, duration: 0.3 }, step + 0.5)
    rest.forEach((card, place) =>
      timeline.to(
        cards[card],
        { ...deckSlot(place), duration: 0.6, ease: "power2.inOut" },
        step + 0.3
      )
    )
    order = [...rest, top]
    order.forEach((card, place) =>
      timeline.set(cards[card], { zIndex: cards.length - place }, step + 1)
    )
  }

  return timeline.scrollTrigger!
}

export function Landing() {
  const container = React.useRef<HTMLDivElement>(null!)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      // Movimiento reducido (ver lib/calm.ts). Los atributos permiten que el
      // CSS también se adapte.
      const calm = prefersCalm()
      if (calm) container.current.dataset.calm = ""
      if (isReviewTrial()) container.current.dataset.prueba = "revision"

      // Scroll suave: cada gesto de rueda tarda SCROLL_SECONDS en frenar, en
      // lugar de saltar de golpe. En pantallas táctiles el scroll sigue nativo.
      if (!calm)
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const lenis = new Lenis({
            duration: SCROLL_SECONDS,
            anchors: true,
            autoRaf: false,
          })
          const raf = (time: number) => lenis.raf(time * 1000)
          lenis.on("scroll", ScrollTrigger.update)
          gsap.ticker.add(raf)
          return () => {
            gsap.ticker.remove(raf)
            lenis.destroy()
          }
        })

      mm.add(
        { desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" },
        (context) => {
          // En móvil no hay sitio a los lados: se queda en el centro, más pequeño.
          const poses = context.conditions?.desktop
            ? POSES
            : POSES.map((pose) => ({
                ...pose,
                x: 0,
                y: pose.y * 0.4,
                scale: pose.scale * 0.5,
              }))

          gsap.set(rig, { ...poses[0], explode: 0, progress: 0 })

          // La caída, pose a pose. Cada tramo dura 1, así que el tiempo de la
          // línea coincide con el índice de la sección.
          const fall = gsap.timeline({
            paused: true,
            defaults: { ease: "power1.inOut", duration: 1 },
          })
          poses.slice(1).forEach((pose) => fall.to(rig, pose))

          // Baraja de "Quién" (solo escritorio): la sección se queda fija y
          // cada tramo de scroll manda la tarjeta de arriba al fondo del mazo.
          // Con movimiento reducido no se fija la sección: las facturas van
          // una debajo de otra.
          const deck =
            context.conditions?.desktop && !calm ? shuffleDeck() : undefined

          const panels = gsap.utils.toArray<HTMLElement>(".panel")
          const pinned = panels.findIndex((el) => el.id === "ponentes")
          let tops: number[] = []
          let holds: number[] = []

          // Dónde empieza cada sección y cuánto scroll se queda fija. Para la
          // sección fijada vale la posición de su ScrollTrigger: su caja, una
          // vez fijada, ya no dice dónde está en la página.
          const measure = () => {
            tops = panels.map((el, i) =>
              deck && i === pinned
                ? deck.start
                : el.getBoundingClientRect().top + window.scrollY
            )
            holds = panels.map((_, i) =>
              deck && i === pinned ? deck.end - deck.start : 0
            )
          }

          // Cada pose se alcanza justo cuando su sección llega arriba, midan
          // lo que midan las secciones. Mientras una sección está fija, el
          // cohete aguanta su pose.
          const follow = (self: ScrollTrigger) => {
            if (tops.length < 2) return
            rig.progress = self.progress
            const y = self.scroll()
            let i = 0
            while (i < tops.length - 2 && y >= tops[i + 1]) i++
            const span = tops[i + 1] - tops[i] - holds[i]
            const local = span > 0 ? (y - tops[i] - holds[i]) / span : 1
            gsap.to(fall, {
              time: i + gsap.utils.clamp(0, 1, local),
              // Corto: el scroll ya llega suavizado
              duration: 0.4,
              ease: "power2.out",
              overwrite: true,
            })
          }

          const tracker = ScrollTrigger.create({
            trigger: ".content",
            start: "top top",
            end: "bottom bottom",
            onUpdate: follow,
          })

          // El evento global llega cuando todas las posiciones están ya
          // recalculadas, incluido el hueco que deja la sección fijada.
          const remeasure = () => {
            measure()
            follow(tracker)
          }
          ScrollTrigger.addEventListener("refresh", remeasure)
          remeasure()

          return () => ScrollTrigger.removeEventListener("refresh", remeasure)
        }
      )

      // Intento de despegue: enciende, avanza medio cuerpo, se queda sin fuelle
      // y vuelve a caer. No arranca solo: se lanza una vez por cada clic en el
      // cohete mientras el hero está a la vista.
      const attempt = gsap
        .timeline({ paused: true })
        .to(launch, {
          thrust: 0.4,
          shake: 0.015,
          duration: 0.8,
          ease: "power1.in",
        })
        .to(launch, { thrust: 1, shake: 0.03, duration: 0.3 })
        .to(launch, { lift: 0.55, duration: 1.3, ease: "power2.in" }, "<")
        .to(launch, { thrust: 0.15, duration: 0.12 })
        .to(launch, { thrust: 0.8, duration: 0.1 })
        .to(launch, { thrust: 0, shake: 0, duration: 0.15 })
        .to(launch, { lift: 0, duration: 0.9, ease: "bounce.out" })

      // Fuera del hero, un clic le saca un único acelerón.
      const burst = gsap
        .timeline({ paused: true })
        .to(launch, { thrust: 1, shake: 0.03, duration: 0.2 })
        .to(launch, { lift: 0.3, duration: 0.5, ease: "power2.out" }, "<")
        .to(launch, { thrust: 0, shake: 0, duration: 0.2 })
        .to(launch, { lift: 0, duration: 0.7, ease: "bounce.out" })

      const hero = ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "bottom 70%",
        onLeave: () => {
          attempt.pause()
          gsap.to(launch, { lift: 0, thrust: 0, shake: 0, duration: 0.3 })
        },
      })

      launch.retry = () => (hero.isActive ? attempt : burst).restart()

      // Explosión al llegar a las entradas. Si vuelves a subir, se recompone.
      ScrollTrigger.create({
        trigger: "#entradas",
        start: "top 15%",
        onEnter: () => {
          // "auto" y no true: true mataría también los tramos de la caída,
          // que animan el mismo objeto.
          gsap.to(rig, {
            explode: 1,
            duration: 1.6,
            ease: "power2.out",
            overwrite: "auto",
          })
          // Sin destello ni temblor de pantalla si se pide menos movimiento.
          if (calm) return
          gsap.fromTo(
            ".flash",
            { opacity: 0.8 },
            { opacity: 0, duration: 0.7, ease: "power2.out" }
          )
          // Al acabar se limpia la transformación: si se quedara puesta, la
          // sección fijada de "Quién" dejaría de fijarse bien.
          gsap.fromTo(
            ".content",
            { x: -10 },
            {
              x: 0,
              duration: 0.6,
              ease: "elastic.out(1, 0.2)",
              clearProps: "transform",
            }
          )
        },
        onLeaveBack: () =>
          gsap.to(rig, { explode: 0, duration: 0.6, overwrite: "auto" }),
      })

      // Entradas de texto: con movimiento reducido el contenido ya está ahí.
      if (calm) {
        return () => {
          launch.retry = undefined
        }
      }

      gsap.from(".hero .reveal", {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.2,
      })

      gsap.utils.toArray<HTMLElement>(".panel:not(.hero)").forEach((el) => {
        gsap.from(el.querySelectorAll(".reveal"), {
          y: 40,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 65%",
            toggleActions: "play none none reverse",
          },
        })
      })

      return () => {
        launch.retry = undefined
      }
    },
    { scope: container }
  )

  return (
    <div ref={container} className="relative overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_80%_10%,rgb(124_92_255/0.18),transparent_70%),radial-gradient(50%_50%_at_10%_90%,rgb(34_211_238/0.12),transparent_70%)]"
      />

      <Scene eventSource={container} />

      {/* Filtro que deforma lo que se ve a través de las tarjetas de cristal */}
      <svg aria-hidden className="pointer-events-none absolute size-0">
        <filter id="liquid-glass" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.018"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="38"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div
        aria-hidden
        className="flash pointer-events-none fixed inset-0 z-20 bg-orange-300 opacity-0 mix-blend-screen"
      />

      <SiteNav />

      <main className="content relative z-1">
        <section id="inicio" className={cn(panel, "hero")}>
          <div className="w-full max-w-xl">
            <p className={eyebrow}>Fecha y lugar · por confirmar</p>
            <h1 className="reveal text-5xl leading-[1.02] font-semibold tracking-tighter text-balance sm:text-6xl lg:text-7xl">
              Ibas a petarlo. Y petaste.
            </h1>
            <p className={lead}>
              Un festival donde emprendedores, desarrolladores, empresarios y
              artistas cuentan el proyecto que se les fue a la mierda y lo que
              aprendieron por el camino. Sin gurús, sin épica y sin «etapas de
              crecimiento».
            </p>
            <div className="reveal mt-8 flex flex-wrap gap-3">
              <LiquidMetalButton label="Pillar entrada" href="#entradas" />
              <LiquidMetalButton
                label="Ver cómo acaba esto"
                href="#manifiesto"
              />
            </div>
            <p className="reveal mt-7 text-sm text-muted-foreground">
              Haz clic en el cohete. Igual contigo sí despega. (No.)
            </p>
          </div>
        </section>

        <section id="manifiesto" className={cn(panel, "lg:items-stretch")}>
          <div className={cn(trio, "lg:grid-rows-2")}>
            <div className="lg:col-start-1 lg:row-start-1">
              <p className={eyebrow}>Por qué existe esto</p>
              <h2 className={headingSide}>
                Otro evento de gente a la que todo le va bien, no.
              </h2>
            </div>
            {MANIFESTO.map((item, i) => (
              <article key={item.title} className={cn(card, CORNERS[i])}>
                <h3 className="mb-1.5 text-lg font-medium">{item.title}</h3>
                <p className="leading-normal text-muted-foreground">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="ponentes" className={cn(panel, "lg:pt-28 lg:pb-12")}>
          <div className={cn(trio, "lg:items-center")}>
            <div>
              <p className={eyebrow}>Quién sube al escenario</p>
              <h2 className={headingSide}>
                Gente que lo tenía todo validado. Por su madre.
              </h2>
              <p className={lead}>
                Suben a contar qué hicieron, por qué salió mal y qué harían
                distinto. Los nombres, en cuanto estén confirmados: aquí el humo
                ya lo vendimos en su día.
              </p>
            </div>
            {/* Baraja: en escritorio las tarjetas se apilan y el scroll las va
                pasando (ver shuffleDeck); en móvil y tablet se pasan
                deslizando en horizontal, una a una. */}
            <ul className="deck-list reveal relative -mx-5 flex snap-x snap-mandatory [scrollbar-width:none] gap-3.5 overflow-x-auto px-5 pb-2 sm:-mx-10 sm:px-10 lg:col-start-3 lg:mx-0 lg:block lg:h-[24.5rem] lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {SPEAKERS.map((speaker, i) => (
                <li
                  key={speaker.who}
                  className="deck-card glass-card glass-deck w-[85%] shrink-0 snap-center rounded-3xl p-6 font-mono text-xs sm:w-[60%] lg:h-[21.5rem] lg:w-auto"
                >
                  {/* Cada tarjeta es una factura: cabecera, a quién se le
                      factura, concepto, partidas, total y observaciones. */}
                  <div className="deck-face relative flex h-full flex-col">
                    <div className="flex items-baseline justify-between gap-4 text-[0.6875rem] tracking-[0.14em] uppercase">
                      <span className="font-semibold text-cyan-400">
                        Factura
                      </span>
                      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                        Nº {String(i + 1).padStart(2, "0")} /{" "}
                        {String(SPEAKERS.length).padStart(2, "0")}
                      </span>
                    </div>

                    <p className="mt-4 text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
                      Facturar a
                    </p>
                    <h3 className="font-sans text-2xl leading-tight font-semibold tracking-tight xl:text-3xl">
                      {speaker.who}
                    </h3>
                    <p className="mt-1 text-muted-foreground">
                      Concepto: {speaker.brings}
                    </p>

                    <dl className="mt-4 grid gap-1.5 border-y border-dashed border-white/20 py-3">
                      {speaker.items.map(([label, value]) => (
                        <div key={label} className="flex items-baseline gap-2">
                          <dt>{label}</dt>
                          <span
                            aria-hidden
                            className="flex-1 border-b border-dotted border-white/25"
                          />
                          <dd className="tabular-nums">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex items-baseline justify-between gap-4 font-semibold tracking-[0.1em] uppercase">
                      <span>Total</span>
                      <span className="text-cyan-400">A fondo perdido</span>
                    </div>

                    <p className="mt-auto pt-3 font-sans text-sm leading-snug text-muted-foreground">
                      {speaker.line}
                    </p>

                    <span
                      aria-hidden
                      className="absolute top-6 right-0 -rotate-12 rounded-md border-2 border-orange-400/80 px-2 py-0.5 text-[0.6875rem] font-bold tracking-[0.2em] text-orange-400/90 uppercase"
                    >
                      Impagada
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="-mt-2 text-sm text-muted-foreground lg:hidden">
              Desliza para ver las cuatro facturas →
            </p>
          </div>
        </section>

        <section id="programa" className={cn(panel, "lg:justify-end")}>
          <div className="w-full max-w-xl">
            <p className={eyebrow}>Programa</p>
            <h2 className={heading}>Sin casos de éxito. Palabra.</h2>
            <div className="mt-8 grid gap-3.5">
              {PROGRAM.map((block) => (
                <div key={block.title} className={card}>
                  <h3 className="mb-3 text-lg font-medium">{block.title}</h3>
                  <ul className="grid gap-2.5">
                    {block.items.map((item, i) => (
                      <li key={item} className="flex gap-4 leading-snug">
                        <span className="shrink-0 text-cyan-400 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="reveal mt-5 text-sm text-muted-foreground">
              Horarios y cartel completo, cuando estén cerrados. Prometer de más
              ya nos salió mal una vez.
            </p>
          </div>
        </section>

        <section
          id="entradas"
          className={cn(panel, "items-end justify-center pb-28 text-center")}
        >
          <div className="w-full max-w-4xl">
            <p className={eyebrow}>Entradas</p>
            <h2 className={heading}>
              Por una vez, invierte en algo que ya ha fracasado.
            </h2>
            <ul className="mt-8 grid gap-3.5 text-left md:grid-cols-3">
              {REASONS.map((reason) => (
                <li key={reason.who} className={card}>
                  <h3 className="text-sm text-muted-foreground">
                    {reason.who}
                  </h3>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {reason.title}
                  </p>
                  <p className="mt-3 text-sm leading-normal text-muted-foreground">
                    {reason.text}
                  </p>
                </li>
              ))}
            </ul>
            <div className="reveal mt-8 flex flex-col items-center gap-3">
              <LiquidMetalButton
                label="Pillar entrada"
                href="mailto:hola@ejemplo.com"
              />
              <p className="text-sm text-muted-foreground">
                Precio y fechas, por confirmar. Te va a doler menos que lo del
                logo.
              </p>
            </div>
          </div>
          <footer className="absolute inset-x-0 bottom-7 px-5 text-sm text-muted-foreground">
            © 2026 Festival del Fracaso · Ninguna startup fue rescatada durante
            la creación de esta web.
          </footer>
        </section>
      </main>
    </div>
  )
}
