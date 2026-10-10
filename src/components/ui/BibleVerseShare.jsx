import { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, Check, Download, ImagePlus, LoaderCircle, RotateCw, Share2, Trash2 } from 'lucide-react';
import AppDialog from './AppDialog';
import { bibleFonts, readingFont } from '../../lib/bibleTypography';
import { prepareVersePhoto, renderVerseImage, verseImageFormats, verseImageName, verseImageThemes } from '../../lib/verseImage';
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
  const [align, setAlign] = useState('center');
  const [position, setPosition] = useState('center');
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const upload = useRef(0);
  const photoInput = useRef(null);
  const key = `${theme}:${format}:${font}:${align}:${position}:${photo?.id || 0}:${attempt}`;
  const ready = result?.key === key;
  const error = failure?.key === key ? failure.message : '';
  const changeOption = (setter, current, next) => {
    if (current === next) return;
    setter(next); setResult(null); setFailure(null); setNotice('');
  };
  useEffect(() => {
    let active = true, url;
    renderVerseImage(verse, { theme, format, font, align, position, customBackground: photo?.canvas }).then(image => {
      if (!active) return;
      url = URL.createObjectURL(image.blob);
      setResult({ ...image, key, url, file: new File([image.blob], verseImageName(verse, format), { type: 'image/png' }) });
    }).catch(err => { if (active) setFailure({ key, message: err.message || 'No se pudo preparar la imagen.' }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [verse, theme, format, font, align, position, photo, key]);
  useEffect(() => () => { upload.current++; }, []);
  async function choosePhoto(file) {
    if (!file) return;
    const id = ++upload.current;
    setLoadingPhoto(true); setPhotoError('');
    try {
      const canvas = await prepareVersePhoto(file);
      if (id !== upload.current) return;
      setPhoto({ id, canvas }); setTheme('custom'); setResult(null); setFailure(null); setNotice('');
    } catch (error) { if (id === upload.current) setPhotoError(error.message); }
    finally { if (id === upload.current) setLoadingPhoto(false); }
  }
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
    <div className="bible-share-body bible-share-editor">
      <div className="bible-share-preview" aria-busy={!ready && !error}>
        {ready ? <img src={result.url} width={result.width} height={result.height} alt={`Imagen de ${verseCitation(verse)}: ${verse.text}`} />
          : error ? <div className="bible-share-error"><p role="alert">{error}</p><button type="button" className="bible-command" onClick={() => setAttempt(value => value + 1)}><RotateCw size={17} />Reintentar</button></div> : <div role="status"><LoaderCircle size={25} className="bible-spin" /><span>Preparando imagen...</span></div>}
      </div>
      <div className="bible-share-options">
        <p className="bible-share-reference">{verseCitation(verse)}</p>
        <fieldset><legend>Formato</legend><div className="bible-image-formats">{verseImageFormats.map(item => <button type="button" key={item.id} aria-pressed={format === item.id} disabled={sharing} onClick={() => changeOption(setFormat, format, item.id)}><span className={`bible-format-outline is-${item.id}`} aria-hidden="true" /><span>{item.label}</span></button>)}</div></fieldset>
        <fieldset><legend>Paisajes</legend><div className="bible-photo-options">{verseImageThemes.filter(item => item.image).map(item => <button type="button" key={item.id} title={item.label} aria-label={`Fondo ${item.label}`} aria-pressed={theme === item.id} disabled={sharing} onClick={() => changeOption(setTheme, theme, item.id)}><img src={item.thumbnail} width="240" height="426" alt="" /><span>{item.label}</span>{theme === item.id && <Check size={17} aria-hidden="true" />}</button>)}</div></fieldset>
        <fieldset><legend>Colores</legend><div className="bible-share-swatches">{verseImageThemes.filter(item => !item.image).map(item => <button type="button" key={item.id} className="bible-swatch" title={item.label} aria-label={`Diseño ${item.label}`} aria-pressed={theme === item.id} disabled={sharing} style={{ '--swatch-color': item.background, color: item.text }} onClick={() => changeOption(setTheme, theme, item.id)}>{theme === item.id && <Check size={18} />}</button>)}</div></fieldset>
        <div className="bible-own-photo"><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto para el versículo" className="sr-only" tabIndex={-1} disabled={sharing || loadingPhoto} onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} /><button type="button" className="bible-command" disabled={sharing || loadingPhoto} onClick={() => photoInput.current?.click()}>{loadingPhoto ? <LoaderCircle size={18} className="bible-spin" /> : <ImagePlus size={18} />}Mi foto</button>{photo && <><button type="button" className="bible-command" aria-pressed={theme === 'custom'} disabled={sharing || loadingPhoto} onClick={() => changeOption(setTheme, theme, 'custom')}>Usar mi foto</button><button type="button" className="bible-icon" title="Quitar mi foto" aria-label="Quitar mi foto" disabled={sharing || loadingPhoto} onClick={() => { setPhoto(null); if (theme === 'custom') setTheme('mountains'); setResult(null); setNotice(''); }}><Trash2 size={18} /></button></>}{photoError && <p role="alert">{photoError}</p>}</div>
        <label className="bible-share-font">Tipografía<select aria-label="Fuente de la imagen" value={font} disabled={sharing} onChange={event => changeOption(setFont, font, event.target.value)}>{bibleFonts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <fieldset><legend>Alineación</legend><div className="bible-image-tools" role="group" aria-label="Alineación del texto">{[['left', 'Alinear a la izquierda', AlignLeft], ['center', 'Centrar texto', AlignCenter], ['right', 'Alinear a la derecha', AlignRight]].map(([id, label, Icon]) => <button key={id} type="button" title={label} aria-label={label} aria-pressed={align === id} disabled={sharing} onClick={() => changeOption(setAlign, align, id)}><Icon size={21} /></button>)}</div></fieldset>
        <fieldset><legend>Posición</legend><div className="bible-image-tools" role="group" aria-label="Posición del texto">{[['top', 'Texto arriba', AlignVerticalJustifyStart], ['center', 'Texto al medio', AlignVerticalJustifyCenter], ['bottom', 'Texto abajo', AlignVerticalJustifyEnd]].map(([id, label, Icon]) => <button key={id} type="button" title={label} aria-label={label} aria-pressed={position === id} disabled={sharing} onClick={() => changeOption(setPosition, position, id)}><Icon size={21} /></button>)}</div></fieldset>
      </div>
    </div>
    <footer className="bible-share-footer">
        <p className="bible-share-dimensions">{ready ? `PNG · ${result.width} × ${result.height}` : 'Preparando imagen'}</p>
        <p role="status" className="bible-share-notice">{notice}</p>
        <div className="bible-share-actions">
          {supportsShare() && <button type="button" className="bible-command bible-share-primary" aria-label="Compartir imagen" disabled={!ready || sharing || loadingPhoto} onClick={share}>{sharing ? <LoaderCircle size={18} className="bible-spin" /> : <Share2 size={18} />}Compartir</button>}
          <button type="button" aria-label="Descargar imagen" className={`bible-command ${supportsShare() ? '' : 'bible-share-primary'}`} disabled={!ready || sharing || loadingPhoto} onClick={download}><Download size={18} />Descargar</button>
        </div>
    </footer>
  </AppDialog>;
}
