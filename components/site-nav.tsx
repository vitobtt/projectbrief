"use client"

import * as React from "react"
import { Menu, X } from "lucide-react"

import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { cn } from "@/lib/utils"

const LINKS = [
  { id: "manifiesto", label: "Por qué" },
  { id: "ponentes", label: "Quién" },
  { id: "programa", label: "Programa" },
]
const SECTIONS = [...LINKS.map((link) => link.id), "entradas"]

function topOf(id: string) {
  const el = document.getElementById(id)
  return el ? el.getBoundingClientRect().top + window.scrollY : null
}

// Barra de navegación: cápsula flotante de cristal con la sección activa
// marcada, el altímetro del cohete y menú desplegable en móvil.
export function SiteNav() {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState<string | null>(null)
  const [pill, setPill] = React.useState<{ left: number; width: number }>()
  const links = React.useRef<HTMLElement>(null)
  const bar = React.useRef<HTMLSpanElement>(null)
  const readout = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const update = () => {
      // Sección activa: la última cuyo inicio ha pasado del 40 % de la pantalla.
      const line = window.scrollY + window.innerHeight * 0.4
      let current: string | null = null
      for (const id of SECTIONS) {
        const top = topOf(id)
        if (top !== null && top <= line) current = id
      }
      setActive(current)

      const link = links.current?.querySelector<HTMLElement>(
        `[data-id="${current}"]`
      )
      setPill((previous) => {
        if (!link) return undefined
        const next = { left: link.offsetLeft, width: link.offsetWidth }
        return previous?.left === next.left && previous.width === next.width
          ? previous
          : next
      })

      // Altímetro: 100 % arriba del todo y 0 % justo donde explota el cohete.
      const end = topOf("entradas")
      const fall = end === null ? 1 : end - window.innerHeight * 0.15
      const altitude =
        1 - Math.min(Math.max(window.scrollY / Math.max(fall, 1), 0), 1)
      if (bar.current) {
        bar.current.style.transform = `scaleX(${altitude})`
        bar.current.style.backgroundColor =
          altitude < 0.25 ? "#ff5c2b" : "#22d3ee"
      }
      if (readout.current) {
        readout.current.textContent = `${Math.round(altitude * 100)} %`
      }
    }

    const frame = requestAnimationFrame(update)
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-10 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <div className="glass-card glass-nav flex items-center justify-between gap-1.5 rounded-full py-1.5 pr-1.5 pl-4 sm:gap-3 sm:pl-5">
          <a
            href="#inicio"
            className="text-[0.625rem] font-extrabold tracking-[0.06em] whitespace-nowrap uppercase sm:text-sm sm:tracking-[0.1em]"
          >
            Festival del Fracaso
          </a>

          <nav
            ref={links}
            className="relative flex items-center text-sm max-lg:hidden"
          >
            {/* Pastilla que se desliza hasta el enlace de la sección activa */}
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-white/15 transition-[left,width,opacity] duration-300"
              style={
                pill ? { ...pill, opacity: 1 } : { left: 0, width: 0, opacity: 0 }
              }
            />
            {LINKS.map((link) => (
              <a
                key={link.id}
                data-id={link.id}
                href={`#${link.id}`}
                aria-current={active === link.id ? "true" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-2 transition-colors",
                  active === link.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <span
              title="Altitud del cohete"
              className="text-[0.6875rem] tracking-wider whitespace-nowrap text-muted-foreground tabular-nums max-lg:hidden"
            >
              ALT <span ref={readout}>100 %</span>
            </span>
            <button
              type="button"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((value) => !value)}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:text-foreground lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <LiquidMetalButton label="Entradas" href="#entradas" />
          </div>

          {/* Altímetro: se vacía según cae el cohete */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-7 bottom-[3px] h-px overflow-hidden rounded-full bg-white/10"
          >
            <span
              ref={bar}
              className="block h-full origin-left bg-cyan-400 transition-[background-color] duration-300"
            />
          </span>
        </div>

        {open && (
          <nav
            id="menu-movil"
            className="glass-card glass-nav mt-2 grid rounded-3xl p-2 lg:hidden"
          >
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
