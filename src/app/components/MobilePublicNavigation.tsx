'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {PublicButton,PublicIcon,PublicRow,MobilePublicFooter as PublicFooter} from './MobilePublicUI';

const publicPaths=new Set([
 '/', '/how-it-works', '/for-customers', '/for-transporters', '/about',
 '/help', '/contact', '/terms', '/privacy', '/get-quotes',
 '/login', '/register', '/forgot-password', '/reset-password',
]);

export function MobilePublicFooter({signedIn}:{signedIn:boolean}){
 const pathname=usePathname();
 return signedIn&&!publicPaths.has(pathname)?null:<PublicFooter/>;
}

export default function MobilePublicNavigation({dashboardHref}:{dashboardHref?:string}){
 const dialog=useRef<HTMLDialogElement>(null),toggle=useRef<HTMLButtonElement>(null),closeToggle=useRef<HTMLButtonElement>(null);
 const pathname=usePathname();
 function open(){dialog.current?.showModal();closeToggle.current?.focus({preventScroll:true})}
 function close(){dialog.current?.close();toggle.current?.focus()}
 useEffect(()=>{dialog.current?.close()},[pathname]);
 useEffect(()=>{const media=window.matchMedia('(min-width:1024px)');const changed=()=>{if(media.matches)dialog.current?.close()};media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed)},[]);
 // Public pages share the approved design; account screens keep their own navigation.
 if(dashboardHref&&!publicPaths.has(pathname))return null;
 const brand=<Link href="/" onClick={()=>dialog.current?.close()} aria-label="DriveDrop home"><img src="/mobile-public/premium-logo.svg" width="143" height="40" alt="DriveDrop"/></Link>;
 return <><header className="mpOnly mpHeader">{brand}<div><Link href={dashboardHref||"/login?account=customer"}>{dashboardHref?'My account':'Sign in'}</Link><button ref={toggle} type="button" aria-label="Open menu" aria-haspopup="dialog" onClick={open}><PublicIcon name="menu"/></button></div></header><dialog ref={dialog} className="mpMenu" aria-labelledby="mp-menu-title" onClick={e=>{if(e.target===e.currentTarget)close()}}><div className="mpMenuHeader">{brand}<button ref={closeToggle} type="button" aria-label="Close menu" onClick={close}><PublicIcon name="close"/></button></div><div className="mpMenuBody"><h2 id="mp-menu-title">Explore DriveDrop</h2><nav aria-label="Mobile public navigation" onClick={e=>{if((e.target as HTMLElement).closest('a'))close()}}><div className="mpRows"><PublicRow icon="home" title="Home" href="/"/><PublicRow icon="file" title="How it works" href="/how-it-works"/><PublicRow icon="car" title="For customers" href="/for-customers"/><PublicRow icon="truck" title="For transporters" href="/for-transporters"/><PublicRow icon="people" title="About DriveDrop" href="/about"/></div><div className="mpRows"><PublicRow icon="help" title="Help & FAQ" href="/help"/><PublicRow icon="mail" title="Contact us" href="/contact"/></div><div className="mpMenuActions">{dashboardHref?<><PublicButton href={dashboardHref}>Back to my account <PublicIcon name="chevron"/></PublicButton><Link className="mpOutline" href="/account">Account settings</Link></>:<><PublicButton href="/login?account=customer">Customer sign in <PublicIcon name="chevron"/></PublicButton><PublicButton href="/login?account=transporter" secondary>Transporter sign in <PublicIcon name="chevron"/></PublicButton><Link className="mpOutline" href="/register?account=customer">Create an account</Link></>}</div><div className="mpMenuLegal"><Link href="/terms">Terms & Conditions</Link><span>·</span><Link href="/privacy">Privacy Policy</Link></div></nav></div></dialog></>;
}
