import { useEffect, useRef } from 'react';

export default function SpotlightBackground() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      el.style.setProperty('--mx', `${e.clientX}px`);
      el.style.setProperty('--my', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Spotlight que sigue el cursor */}
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), rgba(143, 25, 55, 0.15), transparent 60%)`
        }}
      />

      {/* Orbes flotantes animados */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Orbe principal vino tinto */}
        <div
          className="absolute rounded-full opacity-30 blur-[120px]"
          style={{
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(143, 25, 55, 0.6), transparent 70%)',
            top: '10%',
            left: '15%',
            animation: 'orbFloat1 20s ease-in-out infinite'
          }}
        />
        {/* Orbe secundario dorado */}
        <div
          className="absolute rounded-full opacity-20 blur-[100px]"
          style={{
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(230, 195, 100, 0.4), transparent 70%)',
            top: '50%',
            right: '10%',
            animation: 'orbFloat2 25s ease-in-out infinite'
          }}
        />
        {/* Orbe terciario rosa */}
        <div
          className="absolute rounded-full opacity-20 blur-[140px]"
          style={{
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(255, 178, 186, 0.3), transparent 70%)',
            bottom: '5%',
            left: '40%',
            animation: 'orbFloat3 30s ease-in-out infinite'
          }}
        />
      </div>
    </>
  );
}
