import { useEffect, useRef } from 'react'

function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) return undefined

    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const ctx = canvas?.getContext('2d')

    if (!canvas || !parent || !ctx) return undefined

    let width = 0
    let height = 0
    let animationFrame = 0
    let particles = []
    const mouse = { x: null, y: null, radius: 120 }

    class Particle {
      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.size = Math.random() * 2 + 0.5
        this.density = Math.random() * 20 + 1
        this.opacity = Math.random() * 0.4 + 0.1
        this.vx = (Math.random() - 0.5) * 0.3
        this.vy = (Math.random() - 0.5) * 0.3
      }

      draw() {
        ctx.fillStyle = `rgba(143, 25, 55, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        if (this.x > width) this.x = 0
        if (this.x < 0) this.x = width
        if (this.y > height) this.y = 0
        if (this.y < 0) this.y = height

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x
          const dy = mouse.y - this.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance > 0 && distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius
            this.x -= (dx / distance) * force * this.density
            this.y -= (dy / distance) * force * this.density
          }
        }
      }
    }

    const resize = () => {
      width = canvas.width = parent.offsetWidth
      height = canvas.height = parent.offsetHeight
      particles = Array.from(
        { length: Math.min((width * height) / 10000, 150) },
        () => new Particle(),
      )
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      particles.forEach((particle) => {
        particle.update()
        particle.draw()
      })
      animationFrame = requestAnimationFrame(animate)
    }

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    resize()
    animate()

    window.addEventListener('resize', resize)
    parent.addEventListener('mousemove', handleMouseMove)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      parent.removeEventListener('mousemove', handleMouseMove)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-auto absolute inset-0 z-[-1] h-full w-full"
      ref={canvasRef}
    />
  )
}

export default ParticleCanvas
