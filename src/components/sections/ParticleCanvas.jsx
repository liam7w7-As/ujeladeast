import { useEffect, useRef } from 'react'

function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const ctx = canvas?.getContext('2d')

    if (!canvas || !parent || !ctx) return undefined

    let width = 0
    let height = 0
    let animationFrame = 0
    let particles = []
    let visible = false
    let previousTime = 0
    const mouse = { x: null, y: null, radius: 120 }

    class Particle {
      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.size = Math.random() * 1.4 + 1
        this.density = Math.random() * 3 + 1
        this.opacity = Math.random() * 0.3 + 0.3
        this.vx = (Math.random() - 0.5) * 0.3
        this.vy = (Math.random() - 0.5) * 0.3
      }

      draw() {
        ctx.fillStyle = `rgba(218, 176, 193, ${this.opacity})`
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
      width = parent.offsetWidth
      height = parent.offsetHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      particles = Array.from(
        { length: Math.min(Math.floor((width * height) / 9000), 70) },
        () => new Particle(),
      )
      draw()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      particles.forEach((particle, index) => {
        particle.draw()
        for (let other = index + 1; other < particles.length; other++) {
          const next = particles[other]
          const distance = Math.hypot(particle.x - next.x, particle.y - next.y)
          if (distance < 110) {
            ctx.strokeStyle = `rgba(154, 210, 191, ${(1 - distance / 110) * 0.22})`
            ctx.lineWidth = 0.7
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(next.x, next.y)
            ctx.stroke()
          }
        }
      })
    }

    const animate = time => {
      if (time - previousTime >= 32) {
        particles.forEach(particle => particle.update())
        draw()
        previousTime = time
      }
      animationFrame = requestAnimationFrame(animate)
    }

    const updateAnimation = () => {
      cancelAnimationFrame(animationFrame)
      if (visible && !document.hidden && !motionPreference.matches) animationFrame = requestAnimationFrame(animate)
    }

    const handleMouseMove = (event) => {
      if (event.pointerType === 'touch') return
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(parent)
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      updateAnimation()
    })
    intersection.observe(parent)
    document.addEventListener('visibilitychange', updateAnimation)
    motionPreference.addEventListener('change', updateAnimation)
    parent.addEventListener('pointermove', handleMouseMove)
    parent.addEventListener('pointerleave', handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', updateAnimation)
      motionPreference.removeEventListener('change', updateAnimation)
      parent.removeEventListener('pointermove', handleMouseMove)
      parent.removeEventListener('pointerleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      aria-hidden="true"
      className="landing-particles"
      ref={canvasRef}
    />
  )
}

export default ParticleCanvas
