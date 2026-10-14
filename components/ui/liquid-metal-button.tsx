"use client"

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders"
import { Sparkles } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { isReviewTrial, prefersCalm } from "@/lib/calm"

interface LiquidMetalButtonProps {
  label?: string
  onClick?: () => void
  viewMode?: "text" | "icon"
  // Si se indica, el botón es un enlace.
  href?: string
  // Ancho en píxeles; por defecto se calcula a partir del texto.
  width?: number
}

const SPRING = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
const HEIGHT = 46

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  href,
  width,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([])
  const shaderRef = useRef<HTMLDivElement>(null)
  const shaderMount = useRef<ShaderMount | null>(null)
  const rippleId = useRef(0)
  // Estado del ratón leído desde los temporizadores (el de React se queda viejo)
  const hovered = useRef(false)
  // Con movimiento reducido el metal no se anima
  const calm = useRef(false)

  const setSpeed = (speed: number) => {
    if (!calm.current) shaderMount.current?.setSpeed(speed)
  }

  const dimensions = useMemo(() => {
    const outer =
      viewMode === "icon"
        ? HEIGHT
        : (width ?? Math.max(96, Math.round(label.length * 7.4) + 48))
    return {
      width: outer,
      height: HEIGHT,
      innerWidth: outer - 4,
      innerHeight: HEIGHT - 4,
    }
  }, [viewMode, width, label])

  useEffect(() => {
    const styleId = "shader-canvas-style-exploded"
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    calm.current = prefersCalm()

    if (shaderRef.current) {
      try {
        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_repetition: 4,
            u_softness: 0.5,
            u_shiftRed: 0.3,
            u_shiftBlue: 0.3,
            u_distortion: 0,
            u_contour: 0,
            u_angle: 45,
            u_shape: 1,
            u_isImage: false,
            u_colorBack: [0, 0, 0, 0],
            u_colorTint: [1, 1, 1, 0],
            // Encaje del dibujo dentro del botón
            u_fit: 1,
            u_scale: 8,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0.1,
            u_offsetY: -0.1,
            u_worldWidth: 0,
            u_worldHeight: 0,
          },
          undefined,
          calm.current ? 0 : 0.6
        )
      } catch (error) {
        console.error("Failed to load shader:", error)
      }
    }

    return () => {
      shaderMount.current?.dispose()
      shaderMount.current = null
    }
  }, [])

  const handleMouseEnter = () => {
    hovered.current = true
    setIsHovered(true)
    setSpeed(1)
  }

  const handleMouseLeave = () => {
    hovered.current = false
    setIsHovered(false)
    setIsPressed(false)
    setSpeed(0.6)
  }

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setSpeed(2.4)
    // PRUEBA "revision": se lee el ratón en el momento de restaurar la
    // velocidad, no el que había al hacer clic.
    const wasHovered = isHovered
    setTimeout(() => {
      const now = isReviewTrial() ? hovered.current : wasHovered
      setSpeed(now ? 1 : 0.6)
    }, 300)

    const rect = e.currentTarget.getBoundingClientRect()
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: rippleId.current++,
    }
    setRipples((prev) => [...prev, ripple])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id))
    }, 600)

    onClick?.()
  }

  const size = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
  }
  const layer: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    ...size,
    transformStyle: "preserve-3d",
    transition: `${SPRING}, width 0.4s ease, height 0.4s ease`,
  }
  const press = isPressed
    ? "translateY(1px) scale(0.98)"
    : "translateY(0) scale(1)"

  // Capa invisible que recibe los eventos: enlace si hay href, botón si no.
  const hitProps = {
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    "aria-label": label,
    className: "liquid-hit",
    style: {
      ...layer,
      background: "transparent",
      border: "none",
      cursor: "pointer",
      zIndex: 40,
      transform: "translateZ(25px)",
      overflow: "hidden",
      borderRadius: "100px",
    } satisfies React.CSSProperties,
  }
  const rippleSpans = ripples.map((ripple) => (
    <span
      key={ripple.id}
      style={{
        position: "absolute",
        left: `${ripple.x}px`,
        top: `${ripple.y}px`,
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
        pointerEvents: "none",
        animation: "ripple-animation 0.6s ease-out",
      }}
    />
  ))

  return (
    <div className="relative inline-block">
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
        <div style={{ ...layer, position: "relative", transform: "none" }}>
          {/* Texto o icono */}
          <div
            style={{
              ...layer,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transform: "translateZ(20px)",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            {viewMode === "icon" && (
              <Sparkles
                size={16}
                style={{
                  color: "#e5e5e5",
                  filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.5))",
                }}
              />
            )}
            {viewMode === "text" && (
              <span
                style={{
                  fontSize: "14px",
                  color: "#e5e5e5",
                  fontWeight: 500,
                  textShadow: "0px 1px 2px rgba(0, 0, 0, 0.5)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            )}
          </div>

          {/* Interior oscuro */}
          <div
            style={{
              ...layer,
              transform: `translateZ(10px) ${press}`,
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: `${dimensions.innerWidth}px`,
                height: `${dimensions.innerHeight}px`,
                margin: "2px",
                borderRadius: "100px",
                background: "linear-gradient(180deg, #202020 0%, #000000 100%)",
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)"
                  : "none",
                transition: `${SPRING}, width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
          </div>

          {/* Canto de metal líquido */}
          <div
            style={{
              ...layer,
              transform: `translateZ(0px) ${press}`,
              zIndex: 10,
            }}
          >
            <div
              style={{
                ...size,
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)"
                  : isHovered
                    ? "0px 0px 0px 1px rgba(0, 0, 0, 0.4), 0px 12px 6px 0px rgba(0, 0, 0, 0.05), 0px 8px 5px 0px rgba(0, 0, 0, 0.1), 0px 4px 4px 0px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.2)"
                    : "0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)",
                transition: `${SPRING}, width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  ...size,
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  maxWidth: `${dimensions.width}px`,
                  transition: "width 0.4s ease, height 0.4s ease",
                }}
              />
            </div>
          </div>

          {href ? (
            <a href={href} {...hitProps}>
              {rippleSpans}
            </a>
          ) : (
            <button type="button" {...hitProps}>
              {rippleSpans}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
