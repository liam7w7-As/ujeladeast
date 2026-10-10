import { useEffect, useState } from 'react';
import { Check, Download, LoaderCircle, RotateCw, Share2 } from 'lucide-react';
import AppDialog from './AppDialog';
import { bibleFonts, readingFont } from '../../lib/bibleTypography';
import { renderVerseImage, verseImageFormats, verseImageName, verseImageThemes } from '../../lib/verseImage';
import { verseCitation } from '../../lib/bibleVerses';

export default function BibleVerseShare({ verse, initialFont, onClose }) {
  const [theme, setTheme] = useState('mountains');
  const [format, setFormat] = useState('story');
  const [font, setFont] = useState(readingFont(initialFont).id);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [notice, setNotice] = useState('');
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const key = `${theme}:${format}:${font}:${attempt}`;
  const ready = result?.key === key;
  const error = failure?.key === key ? failure.message : '';
  const changeOption = (setter, current, next) => {
    if (current === next) return;
    setter(next); setResult(null); setFailure(null); setNotice('');
  };
  useEffect(() => {
    let active = true, url;
    renderVerseImage(verse, { theme, format, font }).then(image => {
      if (!active) return;
      url = URL.createObjectURL(image.blob);
      setResult({ ...image, key, url, file: new File([image.blob], verseImageName(verse, format), { type: 'image/png' }) });
    }).catch(err => { if (active) setFailure({ key, message: err.message || 'No se pudo preparar la imagen.' }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [verse, theme, format, font, key]);
  const supportsShare = () => {
    try { return ready && typeof navigator.share === 'function' && navigator.canShare?.({ files: [result.file] }); }
    catch { return false; }
  };
  const download = () => {
    if (!ready) return;
    const link = document.createElement('a');
    link.href = result.url; link.download = result.file.name;
    document.body.append(link); link.click(); link.remove();
    setNotice('Imagen preparada para guardar.');
  };
  const share = async () => {
    if (!ready || sharing) return;
    setSharing(true); setNotice('');
    try {
      await navigator.share({ files: [result.file], title: verseCitation(verse) });
      setNotice('Imagen compartida.');
    } catch (err) {
      if (err.name !== 'AbortError') setNotice('No se pudo abrir el menú para compartir. Puedes descargar la imagen.');
    } finally { setSharing(false); }
  };
  return <AppDialog open onClose={onClose} busy={sharing} title="Compartir versículo" wide>
    <div className="bible-share-body">
      <div className="bible-share-preview" aria-busy={!ready && !error}>
        {ready ? <img src={result.url} width={result.width} height={result.height} alt={`Imagen de ${verseCitation(verse)}: ${verse.text}`} />
          : error ? <div className="bible-share-error"><p role="alert">{error}</p><button type="button" className="bible-command" onClick={() => setAttempt(value => value + 1)}><RotateCw size={17} />Reintentar</button></div> : <div role="status"><LoaderCircle size={25} className="bible-spin" /><span>Preparando imagen...</span></div>}
      </div>
      <div className="bible-share-options">
        <p className="bible-share-reference">{verseCitation(verse)}</p>
        <fieldset><legend>Formato</legend><div className="bible-image-formats">{verseImageFormats.map(item => <button type="button" key={item.id} aria-pressed={format === item.id} disabled={sharing} onClick={() => changeOption(setFormat, format, item.id)}><span className={`bible-format-outline is-${item.id}`} aria-hidden="true" /><span>{item.label}</span></button>)}</div></fieldset>
        <fieldset><legend>Paisajes</legend><div className="bible-photo-options">{verseImageThemes.filter(item => item.image).map(item => <button type="button" key={item.id} title={item.label} aria-label={`Fondo ${item.label}`} aria-pressed={theme === item.id} disabled={sharing} onClick={() => changeOption(setTheme, theme, item.id)}><img src={item.thumbnail} width="240" height="426" alt="" /><span>{item.label}</span>{theme === item.id && <Check size={17} aria-hidden="true" />}</button>)}</div></fieldset>
        <fieldset><legend>Colores</legend><div className="bible-share-swatches">{verseImageThemes.filter(item => !item.image).map(item => <button type="button" key={item.id} className="bible-swatch" title={item.label} aria-label={`Diseño ${item.label}`} aria-pressed={theme === item.id} disabled={sharing} style={{ '--swatch-color': item.background, color: item.text }} onClick={() => changeOption(setTheme, theme, item.id)}>{theme === item.id && <Check size={18} />}</button>)}</div></fieldset>
        <label className="bible-share-font">Tipografía<select aria-label="Fuente de la imagen" value={font} disabled={sharing} onChange={event => changeOption(setFont, font, event.target.value)}>{bibleFonts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        {ready && <p className="bible-share-dimensions">PNG · {result.width} × {result.height}</p>}
        <p role="status" className="bible-share-notice">{notice}</p>
        <div className="bible-share-actions">
          {supportsShare() && <button type="button" className="bible-command bible-share-primary" disabled={!ready || sharing} onClick={share}>{sharing ? <LoaderCircle size={18} className="bible-spin" /> : <Share2 size={18} />}Compartir imagen</button>}
          <button type="button" className={`bible-command ${supportsShare() ? '' : 'bible-share-primary'}`} disabled={!ready || sharing} onClick={download}><Download size={18} />Descargar imagen</button>
        </div>
      </div>
    </div>
  </AppDialog>;
}
