import Link from 'next/link';
import type {ReactNode} from 'react';

export type PublicIconName='home'|'user'|'truck'|'car'|'shield'|'mail'|'help'|'file'|'camera'|'pin'|'calendar'|'coins'|'chat'|'people'|'search'|'chevron'|'back'|'menu'|'close'|'eye'|'key'|'check';
export function PublicIcon({name}:{name:PublicIconName}){
 const paths:Record<PublicIconName,ReactNode>={
 home:<><path d="m3 10 9-7 9 7v11h-6v-8H9v8H3Z"/></>,
 user:<><circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></>,
 truck:<><path d="M2 5h12v13H2ZM14 9h5l3 5v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
 car:<><path d="m4 10 3-6h10l3 6v10H4ZM4 10h16M7 14h2m6 0h2M6 20v2m12-2v2"/></>,
 shield:<><path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
 mail:<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/></>,
 help:<><circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01"/></>,
 file:<><path d="M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8m-8 4h8"/></>,
 camera:<><path d="M3 6h5l2-3h4l2 3h5v15H3Z"/><circle cx="12" cy="13" r="4"/></>,
 pin:<><path d="M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/></>,
 calendar:<><rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h2m3 0h2m3 0h1M7 18h2"/></>,
 coins:<><ellipse cx="10" cy="5" rx="7" ry="3"/><path d="M3 5v10c0 4 14 4 14 0V5M3 10c0 4 14 4 14 0m3 0v8c0 4-13 5-14 1"/></>,
 chat:<path d="M21 11a9 9 0 0 1-9 9H8l-5 2 1-6a9 9 0 1 1 17-5ZM7 10h10M7 14h7"/>,
 people:<><circle cx="9" cy="7" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6m2 4a6 6 0 0 1 4 6"/></>,
 search:<><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/></>,
 chevron:<path d="m9 5 7 7-7 7"/>,back:<path d="m15 5-7 7 7 7"/>,menu:<path d="M3 5h18M3 12h18M3 19h18"/>,close:<path d="m5 5 14 14M5 19 19 5"/>,
 eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
 key:<><circle cx="8" cy="8" r="5"/><path d="m12 12 10 10m-5-5 3-3m-6 0 3-3"/></>,check:<path d="m5 12 4 4L20 5"/>,
 };
 return <svg className="mpIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function PublicBack({href='/',label='Home'}:{href?:string;label?:string}){return <Link className="mpBack" href={href}><PublicIcon name="back"/>{label}</Link>}
export function PublicButton({href,children,secondary=false}:{href:string;children:ReactNode;secondary?:boolean}){return <Link className={`mpButton${secondary?' mpSecondary':''}`} href={href}>{children}</Link>}
export function PublicRow({icon,title,description,href}:{icon:PublicIconName;title:string;description?:string;href?:string}){
 const body=<><span className="mpIconTile"><PublicIcon name={icon}/></span><span><strong>{title}</strong>{description&&<small>{description}</small>}</span>{href&&<PublicIcon name="chevron"/>}</>;
 return href?<Link className="mpRow" href={href}>{body}</Link>:<div className="mpRow">{body}</div>;
}
export function PublicNote({icon='shield',title,children}:{icon?:PublicIconName;title:string;children:ReactNode}){return <aside className="mpNote"><PublicIcon name={icon}/><div><strong>{title}</strong><p>{children}</p></div></aside>}
export function MobilePublicFooter(){return <footer className="mpOnly mpFooter"><Link href="/" aria-label="DriveDrop home"><img src="/orange-design-preview/assets/logo.svg" width="178" height="48" alt="DriveDrop"/></Link><p>UK vehicle transport, made simpler.</p><nav aria-label="Public footer">{[['/how-it-works','How it works'],['/about','About us'],['/for-customers','For customers'],['/help','Help & FAQ'],['/for-transporters','For transporters'],['/contact','Contact us']].map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><div><Link href="/terms">Terms & Conditions</Link><span>·</span><Link href="/privacy">Privacy Policy</Link></div><small>© {new Date().getFullYear()} DriveDrop</small></footer>}
