export function quoteCollectionDate(q:{proposedCollectionDate?:string|null;job:{collectionDate:string}}){return q.proposedCollectionDate||q.job.collectionDate}
export function sortQuotes<T extends {id:string;createdAt:string;proposedCollectionDate?:string|null;job:{collectionDate:string}}>(quotes:T[],latest=false){
 const value=(q:T)=>{const n=Date.parse(quoteCollectionDate(q));return Number.isFinite(n)?n:Number.MAX_SAFE_INTEGER};
 return [...quotes].sort((a,b)=>(latest?-1:1)*(value(a)-value(b))||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
}
