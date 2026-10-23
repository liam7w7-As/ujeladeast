export default function AppLoading({ label = 'Abriendo UJELADEA' }) {
  return <div className="app-loading" role="status">
    <img src="/logo-ujeladea.png" alt="" width="120" height="140" />
    <span>{label}</span>
    <i aria-hidden="true" />
  </div>;
}
