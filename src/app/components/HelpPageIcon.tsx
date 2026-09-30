import CustomerIcon from './CustomerPageIcon';
import TransporterIcon from './TransporterPageIcon';
export default function HelpPageIcon({name}:{name:string}){
 if(['file','search','arrow'].includes(name))return <CustomerIcon name={name}/>;
 if(['truck','pound','user'].includes(name))return <TransporterIcon name={name}/>;
 return <svg className="approvedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 {name==='verification'?<><circle cx="9" cy="6" r="4"/><path d="M1 23v-4a8 8 0 0 1 12-7M1 23h12M18 11l5 2v4c0 4-5 7-5 7s-5-3-5-7v-4Z"/></>:name==='chat'?<><path d="M2 3h20v15H9l-6 5v-5H2Z M6 8h12M6 12h9"/></>:name==='chevron'?<path d="m6 9 6 6 6-6"/>:name==='info'?<><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M12 11v6M12 7v.2" stroke="white"/></>:<><circle cx="12" cy="12" r="10"/><path d="M8.5 8a3.5 3.5 0 1 1 6 2.5c-2 1-2.5 2-2.5 4M12 18v.1"/></>}
 </svg>
}
