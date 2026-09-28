import Link from 'next/link';

/** No handlers or duplicate form instances: this is desktop-only presentational copy. */
export default function DesktopHeroCopy() {
  return <div className="desktopHeroCopy">
    <span className="desktopHeroEyebrow"><span aria-hidden="true">🇬🇧</span> UK WIDE COVERAGE</span>
    <h1>The UK’s Smart Way<br />to Deliver Vehicles</h1>
    <p>DriveDrop connects you with independent transporters. Compare quotes, profiles and reviews for your vehicle delivery across the UK.</p>
    <div className="desktopHeroActions"><Link className="btn orange" href="/get-quotes" prefetch={false}>Get a Quote <span aria-hidden="true">→</span></Link><Link className="btn light" href="/how-it-works" prefetch={false}><span aria-hidden="true">▷</span> How It Works</Link></div>
    <div className="desktopHeroTrust"><span>✓ Free quotes</span><span>✓ No obligation</span><span>✓ UK-wide</span></div>
  </div>;
}
