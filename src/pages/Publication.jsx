import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import { Metadata } from '../components/seo/Metadata';
import PublicationContent from '../components/seo/PublicationContent';
import ShareButton from '../components/ui/ShareButton';
import { postMetadata } from '../lib/seo';
import './institution.css';

function initialState(id) {
  try {
    const data = JSON.parse(document.getElementById('public-post-data')?.textContent || 'null');
    if (data?.id === id) return data;
  } catch { /* The client can obtain the public record independently. */ }
  return { id, status: 0 };
}
function PublicationDetail({ id }) {
  const [initial] = useState(() => initialState(id));
  const [state, setState] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!attempt && [200, 404].includes(initial.status)) return;
    let active = true;
    fetch(`/api/public-seo?kind=data&id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(12000) })
      .then(async response => {
        if (![200, 404].includes(response.status)) throw new Error('Unavailable');
        const data = await response.json();
        if (data.id !== id || data.status !== response.status || (data.status === 200 && data.post?.id !== id)) throw new Error('Invalid response');
        if (active) setState(data);
      })
      .catch(() => { if (active) setState({ id, status: 503 }); });
    return () => { active = false; };
  }, [id, attempt, initial.status]);
  const post = state.status === 200 ? state.post : null;
  return <PageShell activeItem="feed" ambient={false}>
    <Metadata page={post ? postMetadata(post) : { title: state.status === 404 ? 'Publicaci\u00f3n no disponible | UJELADEA' : 'Publicaci\u00f3n | UJELADEA', noindex: true }} />
    <main className="publication-main">
      {post ? <><PublicationContent post={post} /><div className="publication-actions"><ShareButton post={post} /><Link className="institution-link" to={`/feed?post=${id}`}>{'Ver conversaci\u00f3n'}</Link></div></>
        : <section className="institution-content"><h1>{state.status === 0 ? 'Cargando publicaci\u00f3n...' : state.status === 404 ? 'Publicaci\u00f3n no disponible' : 'No pudimos cargar la publicaci\u00f3n'}</h1><p role="status">{state.status === 404 ? 'Puede haberse retirado o no ser p\u00fablica.' : state.status === 503 ? 'Comprueba tu conexi\u00f3n e intenta nuevamente.' : 'Un momento, por favor.'}</p>{state.status === 503 && <button type="button" className="institution-link mr-6" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}<Link className="institution-link" to="/feed">Volver a la comunidad</Link></section>}
    </main>
  </PageShell>;
}
export default function Publication() {
  const { id } = useParams();
  return <PublicationDetail key={id.toLowerCase()} id={id.toLowerCase()} />;
}
