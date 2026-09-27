/** Option 5: the white pin with an orange right half and the existing wordmark. */
export default function MobileBrandLogo(){
  return <span className="mobileBrandLogo" role="img" aria-label="DriveDrop">
    <svg className="mobileBrandPin" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M49 5C28 5 16 19 16 38c0 18 15 34 33 55 18-21 33-37 33-55C82 19 70 5 49 5Z" fill="white"/>
      <path d="M49 5C70 5 82 19 82 38c0 18-15 34-33 55Z" fill="#ff801a"/>
      <circle cx="49" cy="38" r="12" fill="#081b35" stroke="white" strokeWidth="3"/>
    </svg>
    <span className="mobileBrandWordmark"/>
  </span>;
}
