type SendEmailInput={to:string;subject:string;heading:string;body:string;ctaLabel?:string;ctaPath?:string;preheader?:string};

function appOrigin(){
  if(process.env.NEXT_PUBLIC_APP_URL)return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,'');
  if(process.env.VERCEL_BRANCH_URL)return `https://${process.env.VERCEL_BRANCH_URL}`;
  if(process.env.VERCEL_URL)return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function transactionalNotificationsEnabled(){
  if(process.env.VERCEL_ENV==='production')return false;
  if(process.env.VERCEL_ENV==='preview')return true;
  return process.env.TRANSACTIONAL_EMAILS_ENABLED==='true';
}

function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c))}

export async function sendTransactionalEmail(input:SendEmailInput){
  const key=process.env.RESEND_API_KEY;
  if(!key||!transactionalNotificationsEnabled())return {sent:false,reason:'disabled'} as const;
  const ctaUrl=input.ctaPath?`${appOrigin()}${input.ctaPath.startsWith('/')?input.ctaPath:`/${input.ctaPath}`}`:null;
  const html=`<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader||input.subject)}</div><div style="max-width:600px;margin:0 auto;padding:28px 16px"><div style="background:#172033;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0"><div style="font-size:22px;font-weight:800;letter-spacing:-.3px">DriveDrop</div></div><div style="background:#fff;padding:30px 26px;border-radius:0 0 14px 14px"><h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(input.heading)}</h1><p style="font-size:16px;line-height:1.6;margin:0 0 22px;white-space:pre-line">${escapeHtml(input.body)}</p>${ctaUrl&&input.ctaLabel?`<p style="margin:0 0 24px"><a href="${ctaUrl}" style="display:inline-block;background:#c85c0b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${escapeHtml(input.ctaLabel)}</a></p>`:''}<p style="font-size:13px;color:#667085;margin:26px 0 0">This is an automated DriveDrop account notification.</p></div></div></body></html>`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'DriveDrop <account@contact.drive-drop.com>',to:[input.to],subject:input.subject,html})});
  if(!response.ok){const text=await response.text().catch(()=>String(response.status));throw new Error(`TRANSACTIONAL_EMAIL_${response.status}:${text.slice(0,200)}`)}
  return {sent:true} as const;
}

export async function sendTransactionalEmailSafely(input:SendEmailInput){try{return await sendTransactionalEmail(input)}catch(error){console.error('DriveDrop transactional email failed',{to:input.to,subject:input.subject,error});return {sent:false,reason:'error'} as const}}
