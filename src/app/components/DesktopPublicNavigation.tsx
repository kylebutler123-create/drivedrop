import Link from 'next/link';

/** Static desktop navigation. The existing mobile header and account handlers remain in Layout. */
export default function DesktopPublicNavigation() {
  return <header className="desktopPublicHeader">
    <div className="desktopPublicHeaderInner">
      <Link className="desktopBrandLink" href="/" aria-label="DriveDrop home" prefetch={false}>
        <img src="/drivedrop-desktop-brand.svg" width={250} height={55} alt="DriveDrop — Vehicle delivery, simplified" loading="lazy" />
      </Link>
      <nav className="desktopPublicLinks" aria-label="Main navigation">
        <Link href="/how-it-works" prefetch={false}>How It Works</Link>
        <Link href="/for-customers" prefetch={false}>For Customers</Link>
        <Link href="/for-transporters" prefetch={false}>For Transporters</Link>
        <Link href="/about" prefetch={false}>About Us</Link>
        <Link href="/help" prefetch={false}>Help</Link>
      </nav>
      <div className="desktopPublicAccess">
        <Link href="/login?account=customer" className="desktopLoginLink" prefetch={false}>Log in</Link>
        <Link href="/get-quotes" className="btn orange" prefetch={false}>Get a Quote</Link>
      </div>
    </div>
  </header>;
}

export function DesktopPublicFooter() {
  return <footer className="desktopPublicFooter">
    <div className="desktopFooterGrid">
      <div className="desktopFooterBrand">
        <Link href="/" aria-label="DriveDrop home" prefetch={false}><img src="/drivedrop-desktop-brand.svg" width={250} height={55} loading="lazy" alt="DriveDrop" /></Link>
        <p>Vehicle transport, made simpler.</p>
        <p>Connecting customers with independent vehicle transporters across the UK.</p>
      </div>
      <nav aria-label="Customer footer links"><h2>For Customers</h2><Link href="/how-it-works" prefetch={false}>How it works</Link><Link href="/get-quotes" prefetch={false}>Get a quote</Link><Link href="/login?account=customer" prefetch={false}>Customer login</Link><Link href="/help" prefetch={false}>Help / FAQ</Link></nav>
      <nav aria-label="Transporter footer links"><h2>For Transporters</h2><Link href="/for-transporters" prefetch={false}>Transport with DriveDrop</Link><Link href="/register?account=transporter" prefetch={false}>Join as a transporter</Link><Link href="/login?account=transporter" prefetch={false}>Transporter login</Link></nav>
      <nav aria-label="Company and legal footer links"><h2>DriveDrop</h2><Link href="/about" prefetch={false}>About us</Link><Link href="/contact" prefetch={false}>Contact & support</Link><Link href="/terms" prefetch={false}>Terms & Conditions</Link><Link href="/privacy" prefetch={false}>Privacy Policy</Link></nav>
    </div>
    <div className="desktopFooterBottom"><span>© {new Date().getFullYear()} DriveDrop. All rights reserved.</span><strong>UK-wide vehicle transport</strong></div>
  </footer>;
}
