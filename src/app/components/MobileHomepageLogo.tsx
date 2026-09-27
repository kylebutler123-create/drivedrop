export default function MobileHomepageLogo(){
  return <span className="mobileHomepageLogo" role="img" aria-label="DriveDrop">
    <svg className="mobileHomepagePin" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M16 39C16 19 29 5 49 5S82 19 82 39" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <path d="M16 39c0 18 15 34 33 54 18-20 33-36 33-54" fill="none" stroke="#ff801a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="49" cy="38" r="12" fill="none" stroke="white" strokeWidth="5"/>
    </svg>
    <span className="mobileHomepageWordmark"/>
  </span>;
}
