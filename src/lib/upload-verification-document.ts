import {prepareVerificationFile} from './prepare-verification-file';

const endpoint='/api/transporter/verification/documents/direct';
type Metadata={type:string;expiresAt?:string};
async function responseBody(response:Response){return response.json().catch(()=>({}))}
export async function uploadVerificationDocument(file:File,metadata:Metadata,onStage:(stage:string)=>void){
  onStage(file.type==='application/pdf'?'Preparing document…':'Preparing photo…');
  const prepared=await prepareVerificationFile(file);
  const start=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...metadata,size:prepared.size,contentType:prepared.type})});
  const ticket=await responseBody(start);
  if(!start.ok)throw new Error(ticket.error||'Unable to prepare a secure upload. Please try again.');
  if(typeof ticket.signedUrl!=='string'||typeof ticket.receipt!=='string')throw new Error('Invalid upload response. Please refresh and try again.');
  onStage('Uploading securely…');
  const uploaded=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':prepared.type,'x-upsert':'false','Cache-Control':'no-store'},body:prepared,credentials:'omit'});
  if(!uploaded.ok)throw new Error('Unable to upload this document. Please check your connection and try again.');
  onStage('Checking document…');
  // Finalization is idempotent: one retry cannot create duplicate documents.
  for(let attempt=0;attempt<2;attempt++){
    let response:Response;
    try{response=await fetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({receipt:ticket.receipt})})}
    catch{if(attempt===0)continue;throw new Error('Unable to confirm the upload. Please check your connection and try again.')}
    const result=await responseBody(response);
    if(response.ok)return result;
    if(response.status>=500&&attempt===0)continue;
    throw new Error(result.error||'Unable to confirm this document. Please try again.');
  }
  throw new Error('Unable to confirm this document. Please try again.');
}
