export function disputesEnabled(){
  if(process.env.VERCEL_ENV==='production') return false;
  if(!process.env.VERCEL_ENV&&process.env.NODE_ENV==='production') return false;
  if(process.env.VERCEL_ENV==='preview') return true;
  return process.env.DISPUTES_ENABLED==='true';
}
