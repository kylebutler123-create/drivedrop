export type ConfirmationSelection={id:string;jobId:string;quoteId:string;status:string};
export function activeConfirmationForJob(rows:ConfirmationSelection[],jobId:string){
 return rows.find(row=>row.jobId===jobId&&['AWAITING_AUTHORISATION','AWAITING_TRANSPORTER','AWAITING_PAYMENT','CAPTURING','BOOKED'].includes(row.status));
}
export function selectionStatusLabel(request:ConfirmationSelection,quoteId:string){
 if(request.quoteId!==quoteId)return 'Request in progress';
 if(request.status==='AWAITING_TRANSPORTER')return 'Awaiting confirmation';
 if(request.status==='BOOKED')return 'Booking confirmed';
 if(request.status==='CAPTURING')return 'Confirming booking';
 return 'Payment in progress';
}
