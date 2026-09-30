import type {ReactNode} from 'react';
export default function TransporterPageIcon({name}:{name:string}){
 const art:Record<string,ReactNode>={
 route:<><path d="M6 12S2 8 2 5a4 4 0 0 1 8 0c0 3-4 7-4 7ZM19 7s-3-3-3-5a3 3 0 0 1 6 0c0 2-3 5-3 5ZM9 10c15 1 15 5 3 7S3 20 4 23"/><circle cx="6" cy="5" r="1"/><circle cx="19" cy="2" r=".7"/></>,
 quote:<><path d="M12 22H4V2h14v7M7 6h7M7 10h4M7 14h3M22 13c-2-4-6-2-5 1v4c0 2-1 3-2 3h8M14 17h7"/></>,
 laptop:<><rect x="3" y="3" width="18" height="15" rx="1"/><path d="M1 18h22v3H1Z"/></>,
 user:<><circle cx="12" cy="6" r="4"/><path d="M3 23v-4a9 9 0 0 1 18 0v4Z"/></>,
 file:<><rect x="4" y="2" width="16" height="20" rx="1.5"/><path d="M8 6h8M8 10h8M8 14h5"/></>,
 truck:<><path d="M1 4h14v15H1ZM15 8h5l3 5v6h-8M17 10v4h6"/><circle cx="5" cy="19" r="2.3" fill="white"/><circle cx="19" cy="19" r="2.3" fill="white"/></>,
 circleCheck:<><circle cx="12" cy="12" r="10"/><path d="m6 12 4 4 8-8"/></>,
 chat:<path d="M21 11c0 5-4 8-9 8H8l-5 3 1-6a7 7 0 0 1-2-5c0-5 4-9 10-9s10 4 10 9Z"/>,
 pound:<><circle cx="12" cy="12" r="10"/><path d="M16 7c-1-4-7-3-7 1v7c0 2-1 3-3 3h11M6 12h9"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/></>,
 coins:<><ellipse cx="14" cy="5" rx="7" ry="3"/><path d="M7 5v4c0 4 14 4 14 0V5M7 9v4c0 4 14 4 14 0V9M7 11c-7 0-8 5-1 6M2 14v4c0 4 14 4 14 0v-2M2 18v3c0 4 14 4 14 0v-3"/></>,
 check:<path d="m5 12 4 4L20 5"/>,
 chevron:<path d="m9 5 7 7-7 7"/>,
 };
 return <svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art[name]||art.file}</svg>
}
