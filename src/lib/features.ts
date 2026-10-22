import {paymentEnvironment,productionPaymentsEnabled} from './payment-runtime';
export function disputesEnabled(){
  if(paymentEnvironment()==='production') return productionPaymentsEnabled()&&process.env.DISPUTES_ENABLED==='true';
  if(process.env.VERCEL_ENV==='preview') return true;
  return process.env.DISPUTES_ENABLED==='true';
}
