export function quoteCollectionDate(q:{proposedCollectionDate?:string|null;job:{collectionDate:string}}){return q.proposedCollectionDate||q.job.collectionDate}
export function sortQuotes<T extends {id:string;createdAt:string;proposedCollectionDate?:string|null;job:{collectionDate:string}}>(quotes:T[],latest=false){
 const value=(q:T)=>{const n=Date.parse(quoteCollectionDate(q));return Number.isFinite(n)?n:Number.MAX_SAFE_INTEGER};
 return [...quotes].sort((a,b)=>(latest?-1:1)*(value(a)-value(b))||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
}
// Dashboard quote view contains only live offers on jobs still open for quotes.
export function dashboardQuotedJobs<T extends {status:string;job:{status:string}}>(quotes:T[]){return quotes.filter(q=>q.status==='PENDING'&&['OPEN','QUOTED'].includes(q.job.status))}
