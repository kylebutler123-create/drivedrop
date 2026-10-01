import type {ReactNode} from 'react';
export default function AccountDesignIcon({name}:{name:'user'|'shield'|'mail'|'lock'|'warning'|'camera'|'edit'}){
 const shapes:Record<typeof name,ReactNode>={
 user:<><circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2Z"/></>,
 shield:<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z"/>,
 mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>,
 lock:<><rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/></>,
 warning:<><circle cx="12" cy="12" r="10"/><path d="M12 6v7m0 4h.01"/></>,
 camera:<><path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></>,
 edit:<><path d="m15 4 5 5M4 16 16 4a2 2 0 0 1 4 4L8 20l-5 1Z"/></>};
 return <svg className="accountDesignIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
