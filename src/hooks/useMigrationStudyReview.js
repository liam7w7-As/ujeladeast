import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { readMigrationStudies } from '../lib/domainStudyReview';

export function useMigrationStudyReview(owner, inventory, online, scan) {
  const [result, setResult] = useState(null);
  const key = JSON.stringify([owner, inventory.signature, inventory.error, online, scan]);
  useEffect(() => {
    if (!online || inventory.error) return;
    const controller = new AbortController();
    let active = true;
    const fail = () => {
      if (active) setResult({ key, status: 'error', error: 'No pudimos comprobar tus estudios en Supabase. Tus datos siguen intactos. Vuelve a comprobar.' });
    };
    const timer = window.setTimeout(() => { fail(); active = false; controller.abort(); }, 15000);
    readMigrationStudies(supabase, owner, inventory, controller.signal).then(report => {
      if (active) setResult({ ...report, key, status: 'ready' });
    }).catch(fail).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [owner, inventory, online, key]);
  if (!online || inventory.error) return { status: 'unavailable' };
  return result?.key === key ? result : { status: 'loading' };
}
