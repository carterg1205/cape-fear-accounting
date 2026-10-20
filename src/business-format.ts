export function formatBusinessMoney(amount:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(amount)?0:2,maximumFractionDigits:2}).format(amount);}
export function businessText(value:unknown){return String(value??'').replace(/\$(-?[\d,]+(?:\.\d{1,2})?)/g,(_match,amount)=>formatBusinessMoney(Number(amount.replaceAll(',',''))));}
