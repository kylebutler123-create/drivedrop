// FinanceEvent.amountPence is a PostgreSQL integer. Cancellation fees use their
// separate fixed policy; this validation is only for admin-entered dispute fines.
export const MAX_DISPUTE_FINE_PENCE=2_147_483_647;

export function validDisputeFinePence(amount:number){
 return Number.isInteger(amount)&&amount>0&&amount<=MAX_DISPUTE_FINE_PENCE;
}

export function parseDisputeFinePence(value:string):number|null{
 const raw=value.trim();
 if(!/^\d+(\.\d{1,2})?$/.test(raw))return null;
 const [pounds,pence='']=raw.split('.');
 const amount=Number(pounds)*100+Number(pence.padEnd(2,'0'));
 return validDisputeFinePence(amount)?amount:null;
}
