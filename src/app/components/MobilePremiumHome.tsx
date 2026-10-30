import Link from 'next/link';
import {PublicIcon} from './MobilePublicUI';

function Arrow(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>}
function BenefitIcon({kind}:{kind:'quotes'|'choice'|'coverage'}){
 return <svg viewBox="0 0 40 44" fill="none" stroke="#071c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='quotes'?<><path d="M8 3h17l9 9v28H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM25 3v10h9M12 18h14M12 24h14M12 30h8"/><path d="M25 40h9V27" stroke="#ff6b0c"/></>:kind==='choice'?<><path d="M20 3 36 9v13c0 10-16 18-16 18S4 32 4 22V9Z"/><path d="m13 22 5 5 10-12" stroke="#ff6b0c"/></>:<><path d="M36 18c0 11-16 24-16 24S4 29 4 18a16 16 0 1 1 32 0Z"/><circle cx="20" cy="18" r="9" fill="#ff6b0c" stroke="none"/></>}
 </svg>;
}
const steps=[
 ['Request','Tell us about your vehicle and journey.'],
 ['Compare','Get quotes from independent transporters.'],
 ['Book','Choose the right transporter for your needs.'],
];

/** Approved 02 / Premium photography homepage; guest mobile presentation only. */
export default function MobilePremiumHome(){
 return <div className="mpOnly mpHome mpPremiumHome">
  <section className="premiumHero" aria-labelledby="premium-home-title">
   <img className="premiumHeroPhoto" src="/mobile-public/premium-coast.webp" width="1200" height="1200" alt="Silver SUV secured to a vehicle transporter on a British coastal road" fetchPriority="high"/>
   <div className="premiumHeroCopy"><p className="premiumEyebrow">VEHICLE TRANSPORT, UK-WIDE</p><h1 id="premium-home-title">A better way to<br/>move your vehicle.</h1><p>Find the right transporter for your journey.</p></div>
  </section>
  <div className="premiumQuoteCard"><Link className="premiumQuoteButton" href="/get-quotes">Get free quotes <Arrow/></Link><p>Compare independent transporters</p></div>
  <ul className="premiumBenefits" aria-label="Why use DriveDrop">
   {(['quotes','choice','coverage'] as const).map((kind,i)=><li key={kind}><BenefitIcon kind={kind}/><strong>{['Free quotes','No obligation','UK-wide'][i]}</strong></li>)}
  </ul>
  <section className="premiumTransporter" aria-labelledby="premium-transporter-title"><div><h2 id="premium-transporter-title">Are you a transporter?</h2><p>Find work that fits your routes.</p><Link href="/for-transporters">Explore transporter work <Arrow/></Link></div><span className="premiumTruck"><PublicIcon name="truck"/></span></section>
  <section className="premiumHow" aria-labelledby="premium-how-title"><h2 id="premium-how-title">From quote to delivery</h2><p>A simple way to arrange your vehicle transport.</p><ol>{steps.map(([title,copy],i)=><li key={title}><span>{i+1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></section>
  <footer className="premiumFooter"><div><Link className="premiumFooterBrand" href="/" aria-label="DriveDrop home"><img src="/mobile-public/premium-logo.svg" width="120" height="31" alt="DriveDrop"/></Link><nav aria-label="Homepage footer"><Link href="/about">About</Link><Link href="/how-it-works">How it works</Link><Link href="/for-transporters">For transporters</Link><Link href="/help">Help</Link></nav></div><nav className="premiumLegal" aria-label="Legal information"><Link href="/terms">Terms &amp; Conditions</Link><span>·</span><Link href="/privacy">Privacy Policy</Link></nav></footer>
 </div>;
}
