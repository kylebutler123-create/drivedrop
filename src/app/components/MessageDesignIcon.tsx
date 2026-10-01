import type {ReactNode} from 'react';
type Name='search'|'chat'|'truck'|'chevron'|'camera'|'trash'|'send';
export default function MessageDesignIcon({name}:{name:Name}){
 const paths:Record<Name,ReactNode>={
 search:<><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
 chat:<path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-5A9 9 0 1 1 21 11.5Z"/>,
 truck:<><path d="M3 17H2V4h13v13H8m7-9h4l3 4v5h-2m-5 0h-1"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></>,
 chevron:<path d="m5 9 7 7 7-7"/>,
 camera:<><path d="m8 5 1.5-2h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></>,
 trash:<><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
 send:<><path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/></>
 };
 return <svg className="messageDesignIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
