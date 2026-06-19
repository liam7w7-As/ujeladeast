function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1]">
      <div className="radial-glow absolute left-1/2 top-0 h-[800px] w-[1200px] -translate-x-1/2 opacity-80" />
      <div className="radial-glow-offset absolute right-0 top-1/2 h-[800px] w-[800px] opacity-60" />
    </div>
  )
}

export default AmbientBackground
