import { ArrowRight } from 'lucide-react'

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 font-inter text-base font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const variants = {
  primary:
    'bg-primary-container text-white hover:bg-[#a61d40] hover:shadow-[0_0_24px_rgba(143,25,55,0.4)]',
  glass:
    'glass-button-outline text-white hover:glass-button-outline-hover',
}

function Button({
  children,
  className = '',
  showArrow = false,
  variant = 'primary',
  ...props
}) {
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      type="button"
      {...props}
    >
      {children}
      {showArrow && <ArrowRight aria-hidden="true" className="size-[18px]" />}
    </button>
  )
}

export default Button
