import type {ReactNode} from 'react';

export default function NotificationDesignIcon({type}:{type:string}){
 let drawing:ReactNode;
 switch(type){
  case 'QUOTE':drawing=<><path d="M6 2h8l5 5v15H6ZM14 2v6h5M14 11c-3-2-5 1-3 3v4M9 15h5M9 18h6"/></>;break;
  case 'DELIVERY':case 'BOOKING':drawing=<><path d="M2 4h12v14H2ZM14 9h4l4 5v4h-8M18 9v5h4"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>;break;
  case 'MESSAGE':drawing=<path d="M21 11a9 8 0 0 1-9 8c-1 0-2-.2-3-.5L3 22l1.8-6A7.6 7.6 0 0 1 3 11a9 8 0 0 1 18 0Z"/>;break;
  case 'PAYMENT':case 'VERIFICATION':drawing=<><path d="m12 2 9 4v6c0 5-5 9-9 11-4-2-9-6-9-11V6Z"/><path d="m8 12 3 3 5-6"/></>;break;
  case 'REVIEW':drawing=<path d="m12 2 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/>;break;
  case 'DISPUTE':drawing=<><path d="m12 2 10 19H2Z"/><path d="M12 9v5M12 18h.01"/></>;break;
  case 'CHEVRON':drawing=<path d="m6 9 6 6 6-6"/>;break;
  case 'CHECK':drawing=<path d="m3 12 6 6L21 5"/>;break;
  case 'CHECK_ALL':drawing=<><path d="m2 12 5 5L18 5m-7 10 3 3L24 6"/></>;break;
  case 'ARROW':drawing=<path d="M3 12h18m-7-7 7 7-7 7"/>;break;
  default:drawing=<><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2"/></>;
 }
 return <svg className="notificationDesignSvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>;
}
