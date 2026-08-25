export const financeConfig={
 depositPercent:Number(process.env.DRIVEDROP_DEPOSIT_PERCENT||20),
 commissionPercent:Number(process.env.DRIVEDROP_COMMISSION_PERCENT||12),
};
export function calculateFinance(transportValuePence:number){
 const depositPence=Math.round(transportValuePence*financeConfig.depositPercent/100);
 const platformFeePence=Math.round(transportValuePence*financeConfig.commissionPercent/100);
 const transporterProceedsPence=transportValuePence-platformFeePence;
 return {transportValuePence,depositPence,platformFeePence,transporterProceedsPence,remainingBalancePence:transportValuePence-depositPence};
}
