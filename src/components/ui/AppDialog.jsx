import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export default function AppDialog({ open, onClose, title, busy = false, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, [open]);
  if (!open) return null;
  return createPortal(<dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }} className={`m-auto w-[calc(100%-24px)] ${wide ? 'max-w-5xl' : 'max-w-xl'} max-h-[calc(100dvh-24px)] rounded-lg border border-white/15 bg-[#17191c] text-[#f4f3f1] p-0 shadow-2xl backdrop:bg-black/80`}>
    <motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex max-h-[calc(100dvh-26px)] flex-col" onClick={event => event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6"><h2 id={titleId} className="text-lg font-semibold break-words">{title}</h2><button type="button" aria-label="Cerrar ventana" onClick={onClose} disabled={busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40"><X size={20} /></button></header>
      {children}
    </motion.div>
  </dialog>, document.body);
}
