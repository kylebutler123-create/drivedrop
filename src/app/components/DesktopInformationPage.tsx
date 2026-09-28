import ApprovedPublicContent from './ApprovedPublicContent';
import Link from 'next/link';

type InformationPage = 'how-it-works' | 'for-customers' | 'for-transporters' | 'about' | 'help' | 'contact';
const copy: Record<InformationPage, {eyebrow: string; title: string; description: string; image: string}> = {
  'how-it-works': {eyebrow: 'HOW IT WORKS', title: 'A simpler way to move vehicles', description: 'One transport request. Quotes from independent transporters. A clear place to manage your booking.', image: '/drivedrop-transporter-countryside.webp'},
  'for-customers': {eyebrow: 'FOR CUSTOMERS', title: 'Vehicle delivery made easy', description: 'Buying, selling or moving a vehicle? Compare transporter quotes and choose the service that suits your journey.', image: '/drivedrop-prestige-loading.webp'},
  'for-transporters': {eyebrow: 'FOR TRANSPORTERS', title: 'More deliveries. A stronger business.', description: 'Find vehicle transport requests, quote for suitable work and manage accepted deliveries from one workspace.', image: '/hero-transporter-coast-mirrored-hq.webp'},
  'about': {eyebrow: 'ABOUT US', title: 'Built on trust. Driven by people.', description: 'DriveDrop brings customers and independent vehicle transporters together through a UK vehicle transport marketplace.', image: '/drivedrop-transporter-countryside.webp'},
  'help': {eyebrow: 'HELP / FAQ', title: 'Find the answers you need', description: 'Guidance on requesting quotes, comparing transporters and managing your vehicle delivery.', image: '/drivedrop-prestige-loading.webp'},
  'contact': {eyebrow: 'CONTACT & SUPPORT', title: 'Keep your delivery conversation in one place', description: 'Use your booking to contact the other party and keep a clear record of your vehicle movement.', image: '/drivedrop-transporter-countryside.webp'},
};
const questions = [
  ['How does DriveDrop work?', 'Submit your collection, delivery and vehicle details. Transporters can send quotes for your request. Compare prices and profiles, then choose a transporter and manage the booking through your account.'],
  ['Are quotes automatic or instant?', 'Quotes are submitted by independent transporters. The time it takes to receive them depends on the job and transporter availability; an immediate quote is not guaranteed.'],
  ['What information do I need?', 'Your collection and delivery locations, collection date, transport type, vehicle type, make, model and running condition. Add the registration when available. Your customer account also needs contact details.'],
  ['Can I request enclosed transport?', 'Enclosed transport is available for cars, motorcycles and classic / prestige vehicles. Choose another transport type for incompatible vehicle categories.'],
  ['How do I contact my transporter?', 'Open the booking under Your deliveries and use Message transporter. Call transporter is available when a contact number is on record.'],
  ['How do I follow delivery progress?', 'Open Your deliveries for status updates and available collection/delivery evidence. A saved proof-of-delivery location is a handover record, not continuous live tracking.'],
  ['What happens when the vehicle is delivered?', 'Review the delivery evidence and confirm receipt once you have received your vehicle. The booking then appears in Completed.'],
  ['What does transporter verification mean?', 'DriveDrop reviews the submitted verification documents. Review the transporter profile and insurance details for your journey; verification is not a guarantee of future performance or cover for every movement.'],
  ['Where can I report a booking problem?', 'Open the relevant booking and use its report-a-problem controls where available. Keep your messages and collection/delivery evidence with the booking.'],
] as const;

export default function DesktopInformationPage({page}: {page: InformationPage}) {
  const content = copy[page];
  const transporter = page === 'for-transporters';
  return <main className={`desktopInformationPage information-${page}`}><ApprovedPublicContent page={page} questions={questions}/>
    <section className="informationHero" style={{backgroundImage: `linear-gradient(90deg,#f6f9fd 0%,rgba(246,249,253,.94) 38%,rgba(246,249,253,.05) 74%),url('${content.image}')`}}>
      <div><span className="desktopSectionEyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p>
        {page !== 'help' && page !== 'contact' && <div className="informationActions"><Link className="btn orange" href={transporter ? '/register?account=transporter' : '/get-quotes'} prefetch={false}>{transporter ? 'Join as a Transporter' : 'Get a Quote'} <span aria-hidden="true">→</span></Link><Link className="btn light" href={transporter ? '/login?account=transporter' : '/how-it-works'} prefetch={false}>{transporter ? 'Transporter login' : 'How It Works'}</Link></div>}
      </div>
    </section>
    <div className="informationBody">
      {(page === 'how-it-works' || page === 'for-customers') && <>
        <header className="informationHeading"><span className="desktopSectionEyebrow">SIMPLE FROM START TO FINISH</span><h2>Simple. Transparent. Reliable.</h2></header>
        <div className="informationSteps"><article><span className="informationStepNumber">1</span><h3>Request your quotes</h3><p>Add the journey, date, transport type and vehicle details. There is no payment required to request quotes.</p></article><article><span className="informationStepNumber">2</span><h3>Choose your transporter</h3><p>Compare the quoted prices, profiles, verification and reviews. Agree any collection-date changes before accepting.</p></article><article><span className="informationStepNumber">3</span><h3>Manage your delivery</h3><p>Message your transporter, follow booking updates, review evidence and confirm receipt once your vehicle arrives.</p></article></div>
        <aside className="informationBand"><div><h2>Know who is moving your vehicle</h2><p>Your contract for transport is with the independent transporter whose quote you accept.</p></div><Link className="btn orange" href="/get-quotes" prefetch={false}>Request transport quotes →</Link></aside>
      </>}
      {transporter && <>
        <div className="informationSteps"><article><span className="informationStepNumber">1</span><h3>Create your account</h3><p>Set up your transporter account and add your business information.</p></article><article><span className="informationStepNumber">2</span><h3>Complete verification</h3><p>Submit your driving licence and insurance certificate for review. Keep your approved insurance current.</p></article><article><span className="informationStepNumber">3</span><h3>Quote and deliver</h3><p>Quote for suitable jobs, arrange collection and record the collection and delivery evidence through your account.</p></article></div>
        <aside className="informationBand"><div><h2>Built around your transport work</h2><p>Available jobs, submitted quotes, active deliveries, customer messages, verification and proceeds in one account.</p></div><Link className="btn orange" href="/register?account=transporter" prefetch={false}>Create transporter account →</Link></aside>
      </>}
      {page === 'about' && <div className="informationSteps"><article><h2>A vehicle marketplace</h2><p>DriveDrop is built specifically for vehicle movements. We connect customers with independent transporters rather than operating the delivery vehicles ourselves.</p></article><article><h2>Choose with confidence</h2><p>Compare the transporter behind each quote using the profile, verification information and available customer feedback.</p></article><article><h2>A clearer journey</h2><p>Keep transport requests, quotes, booking messages and delivery evidence together, from the first request to confirmation of receipt.</p></article></div>}
      {page === 'help' && <div className="informationHelp"><section aria-label="Frequently asked questions">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section><aside><span className="informationSupportIcon" aria-hidden="true">?</span><h2>Need help with a booking?</h2><p>Open your account to find the delivery and its contact or problem-reporting controls.</p><Link className="btn orange" href="/login" prefetch={false}>Open your account</Link><Link className="informationTextLink" href="/contact" prefetch={false}>Contact & support →</Link></aside></div>}
      {page === 'contact' && <div className="informationSteps"><article><h2>Customer enquiries</h2><p>Sign in, open Your deliveries and select your booking to message or call your transporter.</p><Link className="informationTextLink" href="/login?account=customer" prefetch={false}>Customer login →</Link></article><article><h2>Transporter enquiries</h2><p>Open your active delivery to contact the customer. Your account also contains verification and proceeds information.</p><Link className="informationTextLink" href="/login?account=transporter" prefetch={false}>Transporter login →</Link></article><article><h2>A delivery problem?</h2><p>Use the relevant booking’s report-a-problem controls where available, with the messages and evidence that explain the issue.</p><Link className="informationTextLink" href="/help" prefetch={false}>Read the help guide →</Link></article></div>}
    </div>
  </main>;
}
