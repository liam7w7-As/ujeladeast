import PageShell from '../components/layout/PageShell';
import { InstitutionContent, StudyIntroduction } from '../components/seo/PublicContent';
import './institution.css';

export default function About({ study = false }) {
  return <PageShell activeItem={study ? 'bible-studies' : 'about'} ambient={false}>
    <main className="institution-main">
      <img className="institution-logo" src="/logo-ujeladea.png" alt="UJELADEA" width="96" height="96" />
      {study ? <StudyIntroduction /> : <InstitutionContent />}
    </main>
  </PageShell>;
}
