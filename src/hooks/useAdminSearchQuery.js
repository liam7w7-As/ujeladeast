import { useSearchParams } from 'react-router-dom';

export function useAdminSearchQuery() {
  const [params, setParams] = useSearchParams();
  return [params.get('q') || '', value => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set('q', value); else next.delete('q');
    return next;
  }, { replace: true })];
}
