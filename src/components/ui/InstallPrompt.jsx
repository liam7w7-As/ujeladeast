import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Share, EllipsisVertical } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import AppDialog from './AppDialog';
import InstallButton from './InstallButton';
import './pwa-install.css';

export default function InstallPrompt() {
  const [checked, setChecked] = useState(false);
  const { pathname } = useLocation();
  const { status, promotion, help, error, canPrompt, dismissPromotion, closeHelp, checkInstalled } = usePwaInstall();
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const waiting = status === 'pending' || status === 'unconfirmed';
  const quietRoute = pathname === '/biblia' || pathname === '/estudios';
  const close = () => { setChecked(false); closeHelp(); };
  return <>
    <AnimatePresence>
      {promotion && !help && !quietRoute && status !== 'installed' && <div className="pwa-install-prompt">
        <motion.div className="pwa-install-banner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
          <img src="/logo-ujeladea.png" alt="" />
          <div className="pwa-install-copy"><strong>{waiting ? 'Preparando tu aplicación' : 'UJELADEA en tu celular'}</strong><p role="status">{status === 'unconfirmed' ? 'Comprueba si ya aparece entre tus aplicaciones.' : waiting ? 'El navegador está terminando la instalación.' : 'Tu comunidad, a un toque.'}</p></div>
          <div className="pwa-install-banner-actions"><InstallButton /><button type="button" onClick={dismissPromotion}>Ahora no</button></div>
        </motion.div>
      </div>}
    </AnimatePresence>
    <AppDialog open={help && status !== 'installed'} onClose={close} title={waiting ? 'Tu instalación' : 'Instalar UJELADEA'}>
      <div className="pwa-install-help">
        {error && <p role="alert">{error}</p>}
        {waiting ? <><p role="status">{status === 'pending' ? 'La solicitud fue aceptada. El navegador puede tardar un poco en añadir la aplicación.' : 'Todavía no podemos confirmar que la instalación terminó.'}</p><p>Busca UJELADEA entre tus aplicaciones y ábrela desde su icono. Puedes seguir aquí mientras tanto.</p>{status === 'unconfirmed' && <p>Si todavía no aparece, vuelve al menú del navegador y busca Instalar aplicación o Añadir a pantalla de inicio.</p>}<button type="button" className="pwa-install-entry" onClick={async () => { await checkInstalled(); setChecked(true); }}><RefreshCw size={18} />Comprobar de nuevo</button>{checked && <p role="status">No recibimos una confirmación del navegador. Si ya aparece el icono, puedes abrir la aplicación desde allí.</p>}</> : canPrompt ? <InstallButton /> : <>
          <p>{ios ? 'Abre esta página en Safari.' : 'Abre esta página en tu navegador habitual, fuera de otras aplicaciones.'}</p>
          <ol><li>{ios ? <><Share size={18} aria-hidden="true" />Abre el menú y toca Compartir.</> : <><EllipsisVertical size={18} aria-hidden="true" />Abre el menú del navegador.</>}</li><li>Elige {ios ? 'Añadir a pantalla de inicio' : 'Instalar aplicación o Añadir a pantalla de inicio'} y confirma.</li></ol>
          <p>Si ya está instalada, ábrela desde su icono. Algunos navegadores no permiten comprobarlo desde esta página.</p>
        </>}
        <p className="pwa-install-note">La aplicación anterior sigue funcionando. No necesitas desinstalarla ni borrar tus datos.</p>
      </div>
    </AppDialog>
  </>;
}
import { useState } from 'react';
