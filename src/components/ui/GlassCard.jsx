function GlassCard({ children, className = '' }) {
  return (
    <article
      className={`glass-card hover:glass-card-hover flex flex-col gap-8 rounded-3xl p-10 ${className}`}
    >
      {children}
    </article>
  )
}

export default GlassCard
