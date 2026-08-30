export const financeConfig={
 depositPercent:Number(process.env.DRIVEDROP_DEPOSIT_PERCENT||100),
 commissionPercent:Number(process.env.DRIVEDROP_COMMISSION_PERCENT||10),
};

export function calculateCustomerPrice(transporterQuotePence:number){
 const platformFeePence=Math.round(transporterQuotePence*financeConfig.commissionPercent/100);
 const customerTotalPence=transporterQuotePence+platformFeePence;
 return {transporterQuotePence,platformFeePence,customerTotalPence};
}

export function calculateFinance(transporterQuotePence:number){
 const {platformFeePence,customerTotalPence}=calculateCustomerPrice(transporterQuotePence);
 const depositPence=Math.round(customerTotalPence*financeConfig.depositPercent/100);
 const transporterProceedsPence=transporterQuotePence;
 return {
  transportValuePence:customerTotalPence,
  depositPence,
  platformFeePence,
  transporterProceedsPence,
  remainingBalancePence:customerTotalPence-depositPence
 };
}
