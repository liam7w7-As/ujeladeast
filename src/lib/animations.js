// Reusable motion variants for UJELADEA

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } }
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }
};

export const cardHover = {
  whileHover: { 
    y: -4, 
    transition: { duration: 0.2, ease: 'easeOut' } 
  },
  whileTap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

export const buttonTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.96 }
};

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.94, y: 15 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring', damping: 25, stiffness: 350 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.94, 
    y: 10, 
    transition: { duration: 0.2, ease: 'easeIn' } 
  }
};

export const heartPop = {
  scale: [1, 1.4, 0.9, 1.1, 1],
  transition: { duration: 0.45, ease: 'easeInOut' }
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 10px rgba(143, 25, 55, 0.2)',
      '0 0 25px rgba(143, 25, 55, 0.5)',
      '0 0 10px rgba(143, 25, 55, 0.2)'
    ],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};
