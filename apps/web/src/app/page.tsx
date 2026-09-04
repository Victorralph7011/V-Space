import './marketing.css';
import { Nav } from '@/components/marketing/Nav';
import { PortalHero } from '@/components/marketing/PortalHero';
import { StatementFold } from '@/components/marketing/StatementFold';
import { CaptureDeck } from '@/components/marketing/CaptureDeck';
import { SectionsRoster } from '@/components/marketing/SectionsRoster';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { CloseSection } from '@/components/marketing/CloseSection';

/**
 * The public landing page, at the site root. The signed-in app itself lives
 * at `/space` — kept as a genuinely separate route (not a group) so this
 * page can be a plain server component with its own scoped palette
 * (`marketing.css`) instead of inheriting the app shell's monochrome one.
 */
export default function LandingPage() {
  return (
    <div className="mkt">
      <Nav />
      <PortalHero />
      <StatementFold />
      <CaptureDeck />
      <SectionsRoster />
      <HowItWorks />
      <CloseSection />
    </div>
  );
}
