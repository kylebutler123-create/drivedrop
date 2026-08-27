type Bucket={count:number;resetAt:number};
const store:Map<string,Bucket>=(globalThis as any).__drivedropRateLimitStore||new Map<string,Bucket>();
(globalThis as any).__drivedropRateLimitStore=store;

function clientIp(r:Request){const forwarded=r.headers.get('x-forwarded-for')?.split(',')[0]?.trim();return forwarded||r.headers.get('x-real-ip')||'unknown'}

export function checkRateLimit(r:Request,scope:string,limit:number,windowMs:number,identity?:string){const now=Date.now();const key=`${scope}:${clientIp(r)}:${(identity||'').toLowerCase()}`;let bucket=store.get(key);if(!bucket||bucket.resetAt<=now){bucket={count:0,resetAt:now+windowMs};store.set(key,bucket)}bucket.count++;const remaining=Math.max(0,limit-bucket.count);return{allowed:bucket.count<=limit,remaining,retryAfterSeconds:Math.max(1,Math.ceil((bucket.resetAt-now)/1000)),resetAt:bucket.resetAt}}

export function rateLimitResponse(retryAfterSeconds:number){return new Response(JSON.stringify({error:'Too many attempts. Please wait and try again.'}),{status:429,headers:{'content-type':'application/json','retry-after':String(retryAfterSeconds),'cache-control':'no-store'}})}
