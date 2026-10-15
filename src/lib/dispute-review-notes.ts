// Private notes are stored separately from customer-visible resolutionNote.
export type DisputeReviewNote={disputeId:string;kind:string;body:string;createdAt:Date|string};
export function disputeReviewHistory(notes:DisputeReviewNote[]){return notes.map(n=>`[${new Date(n.createdAt).toISOString()}] ${n.kind==='OUTCOME'?'Refund / recovery outcome (record only; no money moved)':'Internal review note'} — ${n.body}`).join('\n\n');}
