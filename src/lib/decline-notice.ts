// Availability API returns newest requests first. Never fall back to an older
// decline after a newer selection, timeout or withdrawal for the same job.
export function latestDecline<T extends {jobId:string;status:string;job:{status:string;selectedQuoteStatus:string}}>(rows:T[],jobId:string):T|undefined{
 const latest=rows.find(row=>row.jobId===jobId);
 return latest?.status==='DECLINED'&&latest.job.selectedQuoteStatus==='WITHDRAWN'&&['OPEN','QUOTED'].includes(latest.job.status)?latest:undefined;
}
export function declineDismissalKey(customerId:string,requestId:string){return `drivedrop:decline-dismissed:v1:${customerId}:${requestId}`;}

export function latestConfirmationIssue<T extends {jobId:string;status:string}>(rows:T[],jobId:string):T|undefined{
 const latest=rows.find(row=>row.jobId===jobId);
 return latest&&['EXPIRED','PAYMENT_FAILED'].includes(latest.status)?latest:undefined;
}

const dismissedThisVisit=new Set<string>();
export function isNoticeDismissed(key:string){
 if(dismissedThisVisit.has(key))return true;
 try{return localStorage.getItem(key)==='1'}catch{return false}
}
export function dismissNotice(key:string){
 try{localStorage.setItem(key,'1')}catch{dismissedThisVisit.add(key)}
 window.dispatchEvent(new Event('drivedrop:customer-notice-dismissed'));
}
export function hasUndismissedQuoteWarnings<T extends {id:string;jobId:string;status:string;job:{status:string;selectedQuoteStatus:string}}>(rows:T[],visibleJobIds:string[],customerId:string|undefined,isDismissed:(key:string)=>boolean){
 if(!customerId)return false;
 const visible=new Set(visibleJobIds);
 return [...new Set(rows.map(row=>row.jobId))].some(jobId=>{
  const warning=(visible.has(jobId)?latestDecline(rows,jobId):undefined)||latestConfirmationIssue(rows,jobId);
  return !!warning&&!isDismissed(declineDismissalKey(customerId,warning.id));
 });
}
