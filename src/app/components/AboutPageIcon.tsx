import type {ReactNode} from 'react';
export default function AboutPageIcon({name}:{name:string}){
 const art:Record<string,ReactNode>={
 uk:<><path d="m13 1-3 1 1 2-3 1 1 2-2 1 1 2-2 1 2 1 2-1 1 2-2 2 1 1-2 1 2 2-1 1-3 1 1 1 4-1 2 1 3-1 3-1-1-2 1-2-2-1-1-3-2-1-1-3-2-1 1-2 2-1-1-2 1-2-2 1Z"/><path d="m4 10-2 1 1 2-2 2 1 2 4-1 1-2-2-1 1-2Z"/></>,
 users:<><circle cx="8" cy="6" r="3.5"/><path d="M1 22v-3a7 7 0 0 1 14 0v3ZM16 3a3.5 3.5 0 1 1 0 7M17 14a6 6 0 0 1 6 6v2h-5"/></>,
 records:<><rect x="1" y="1" width="14" height="17" rx="1.5"/><path d="M5 5h6M5 9h6M5 13h3M18 8h4v15l-5-3h-6"/></>,
 car:<><path d="m2 12 3-5 3-2h8l4 5 2 2v6H2ZM5 10h13"/><circle cx="6" cy="18" r="2" fill="white"/><circle cx="19" cy="18" r="2" fill="white"/><circle cx="19" cy="18" r="4.5" fill="white" stroke="#ff681b"/><path d="m17 18 1.5 1.5L21 17" stroke="#ff681b"/></>,
 truck:<><path d="M1 4h13v15H1ZM14 8h5l4 5v6h-9"/><circle cx="5" cy="19" r="2.5" fill="white"/><circle cx="19" cy="18" r="4.5" fill="white" stroke="#ff681b"/><path d="m17 18 1.5 1.5L21 16" stroke="#ff681b"/></>,
 file:<><path d="M4 1h10l6 6v16H4Z M14 1v7h6M8 11h8M8 15h8M8 19h5"/></>,
 search:<><circle cx="10" cy="10" r="8"/><path d="m16 16 7 7"/></>,
 chat:<><path d="M1 2h16v14H7l-5 4v-4H1ZM20 9h3v14l-5-3h-5v-1"/></>,
 circleCheck:<><circle cx="12" cy="12" r="10.5"/><path d="m6.5 12 4 4 7-8" stroke="#ff681b"/></>,
 arrow:<path d="M3 12h17m-5-5 5 5-5 5"/>,
 chevron:<path d="m6 9 6 6 6-6"/>,
 };
 return <svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art[name]||art.file}</svg>
}
