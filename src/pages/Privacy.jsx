import PageShell from '../components/layout/PageShell';
import PrivacyContent from '../components/seo/PrivacyContent';
import './institution.css';

export default function Privacy() {
  return <PageShell activeItem="privacy" ambient={false}>
    <main className="institution-main">
      <img className="institution-logo" src="/logo-ujeladea.png" alt="UJELADEA" width="96" height="96" />
      <PrivacyContent />
    </main>
  </PageShell>;
}
