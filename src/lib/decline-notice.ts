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
