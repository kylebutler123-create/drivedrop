type ScheduleQuote={proposedCollectionDate?:string|null;proposedCollectionFrom?:string|null;proposedCollectionUntil?:string|null;dateNegotiationStatus?:string};
type ScheduleJob={collectionDate:string;collectionFrom?:string|null;collectionUntil?:string|null};
export function offeredCollection(quote:ScheduleQuote,job:ScheduleJob){
 const proposed=['PROPOSED','ACCEPTED'].includes(quote.dateNegotiationStatus||'')&&!!quote.proposedCollectionDate;
 const date=proposed?quote.proposedCollectionDate!:job.collectionDate;
 const sameDate=date.slice(0,10)===job.collectionDate.slice(0,10);
 const ownWindow=proposed&&quote.proposedCollectionFrom&&quote.proposedCollectionUntil;
 return {date,from:ownWindow?quote.proposedCollectionFrom:sameDate?job.collectionFrom:null,until:ownWindow?quote.proposedCollectionUntil:sameDate?job.collectionUntil:null};
}
export type QuoteSort='date'|'price'|'rating';
export function sortCustomerQuotes<T extends ScheduleQuote&{id:string;pricePence:number;transporter?:{averageRating?:number|null;reviewCount?:number}}>(quotes:T[],job:ScheduleJob,sort:QuoteSort){
 const schedule=(q:T)=>{const s=offeredCollection(q,job);const day=Date.parse(s.date.slice(0,10));return Number.isFinite(day)?day+(s.from?Number(s.from.slice(0,2))*60+Number(s.from.slice(3,5)):1440)*60000:Number.MAX_SAFE_INTEGER;};
 return [...quotes].sort((a,b)=>{
  if(sort==='price'&&a.pricePence!==b.pricePence)return a.pricePence-b.pricePence;
  if(sort==='rating'){
   const rating=(q:T)=>q.transporter?.reviewCount&&q.transporter?.averageRating!=null?Number(q.transporter.averageRating):-1;
   const difference=rating(b)-rating(a);if(difference)return difference;
   const reviews=(b.transporter?.reviewCount||0)-(a.transporter?.reviewCount||0);if(reviews)return reviews;
  }
  return schedule(a)-schedule(b)||a.pricePence-b.pricePence||a.id.localeCompare(b.id);
 });
}
