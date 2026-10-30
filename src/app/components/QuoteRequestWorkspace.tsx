'use client';
import {useState} from 'react';
import HomeQuoteRequestPanel from './HomeQuoteRequestPanel';
import {PublicBack} from './MobilePublicUI';

/** Reuses the existing request/authentication form and API handlers, never a second copy. */
export default function QuoteRequestWorkspace() {
  const [expanded, setExpanded] = useState(true);
  return <main className="homePage desktopQuotePage">
    <div className="mpOnly mpQuoteIntro"><PublicBack/><h1>Get transport quotes</h1><p className="mpIntro">Tell us about your journey.</p></div><header className="desktopQuoteIntro"><span className="desktopSectionEyebrow">YOUR VEHICLE. YOUR JOURNEY.</span><h1>Request Vehicle Transport Quotes</h1><p>Tell us what needs moving. Compare quotes from independent transporters before you book.</p><div className="desktopHeroTrust"><span>✓ Free quotes</span><span>✓ No obligation</span><span>✓ UK-wide</span></div></header>
    <section aria-label="Request vehicle transport" className={`homeHeroPanelShell isQuoteDetails${expanded ? ' isQuoteExpanded' : ''}`}>
      <div className="homeHeroPanelTrack showQuotes"><div className="quotePanel homeHeroPanelSlide"><HomeQuoteRequestPanel wizard expanded={expanded} onExpandChange={setExpanded}/></div></div>
    </section>
  </main>;
}
