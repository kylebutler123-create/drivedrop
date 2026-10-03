'use client';
export default function PaymentsError({reset}:{reset:()=>void}){return <main className="shell" style={{padding:'34px 24px'}}><h1>Payments</h1><p role="alert">We couldn’t load your payment records. Please try again.</p><button className="btn light" onClick={reset}>Try again</button></main>}
