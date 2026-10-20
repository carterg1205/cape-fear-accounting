export type ParamKind='name'|'date'|'money'|'integer'|'rate';
export type CourseParam={key:string;label:string;kind:ParamKind;unit:number;min?:number;max?:number;value:string|number};
export const courseParameters:CourseParam[]=[
 {key:'company',label:'Company name',kind:'name',unit:0,value:'Cape Fear Outfitters'},
 {key:'manager',label:'Shop manager',kind:'name',unit:0,value:'Sarah'},
 {key:'vendor',label:'Equipment supplier',kind:'name',unit:0,value:'Seabreeze Supply Co.'},
 {key:'customer',label:'Customer name',kind:'name',unit:0,value:'Lena Parker'},
 {key:'startDate',label:'Simulation begins',kind:'date',unit:0,value:'2027-01-01'},
 {key:'points',label:'Points per activity',kind:'integer',unit:0,min:1,max:100,value:10},
 {key:'capital',label:'Founding cash contribution',kind:'money',unit:1,min:500000,max:10000000,value:2000000},
 {key:'openingService',label:'Opening tour revenue',kind:'money',unit:1,min:10000,max:300000,value:150000},
 {key:'openingRent',label:'Opening shop rent',kind:'money',unit:1,min:1000,max:100000,value:40000},
 {key:'equipment',label:'Initial equipment cost',kind:'money',unit:2,min:60000,max:500000,value:240000},
 {key:'insurance',label:'Twelve-month insurance premium',kind:'money',unit:2,min:12000,max:240000,value:120000},
 {key:'supplies',label:'Supplies purchased on account',kind:'money',unit:2,min:10000,max:100000,value:30000},
 {key:'creditTours',label:'Tours billed on account',kind:'money',unit:2,min:10000,max:150000,value:80000},
 {key:'deposit',label:'Advance tour deposit',kind:'money',unit:3,min:20000,max:200000,value:90000},
 {key:'earnedDepositPct',label:'Deposit earned (%)',kind:'rate',unit:3,min:1000,max:9000,value:5000},
 {key:'unbilled',label:'Completed tours not yet billed',kind:'money',unit:3,min:1000,max:100000,value:60000},
 {key:'accruedWages',label:'Unpaid wages at month end',kind:'money',unit:3,min:1000,max:100000,value:30000},
 {key:'boardQty',label:'Surfboards purchased',kind:'integer',unit:4,min:3,max:20,value:5},
 {key:'boardCost',label:'Cost per surfboard',kind:'money',unit:4,min:10000,max:100000,value:38000},
 {key:'soldQty',label:'Surfboards sold',kind:'integer',unit:4,min:1,max:15,value:2},
 {key:'boardPrice',label:'Selling price per surfboard',kind:'money',unit:4,min:20000,max:200000,value:65000},
 {key:'layer1',label:'First inventory batch unit cost',kind:'money',unit:5,min:5000,max:30000,value:10000},
 {key:'layer2',label:'Second inventory batch unit cost',kind:'money',unit:5,min:5000,max:30000,value:12000},
 {key:'layer3',label:'Third inventory batch unit cost',kind:'money',unit:5,min:5000,max:30000,value:14000},
 {key:'worksheetSold',label:'Units sold in the cost study',kind:'integer',unit:5,min:1,max:9,value:6},
 {key:'bankFee',label:'Bank service charge',kind:'money',unit:6,min:100,max:10000,value:3000},
 {key:'bankInterest',label:'Interest earned at the bank',kind:'money',unit:6,min:100,max:5000,value:1000},
 {key:'badDebt',label:'Supplied bad debt adjustment',kind:'money',unit:7,min:100,max:10000,value:5000},
 {key:'writeoff',label:'Receivable written off',kind:'money',unit:7,min:100,max:5000,value:2000},
 {key:'newEquipment',label:'New equipment invoice price',kind:'money',unit:8,min:100000,max:500000,value:300000},
 {key:'delivery',label:'Equipment delivery cost',kind:'money',unit:8,min:0,max:50000,value:20000},
 {key:'installation',label:'Equipment installation cost',kind:'money',unit:8,min:0,max:50000,value:10000},
 {key:'residual',label:'New equipment residual value',kind:'money',unit:8,min:0,max:100000,value:30000},
 {key:'life',label:'New equipment useful life in years',kind:'integer',unit:8,min:2,max:10,value:5},
 {key:'retailSale',label:'Retail sale before sales tax',kind:'money',unit:9,min:10000,max:200000,value:50000},
 {key:'salesTax',label:'Supplied sales tax rate (%)',kind:'rate',unit:9,min:100,max:1000,value:700},
 {key:'grossPay',label:'Gross employee wages',kind:'money',unit:9,min:20000,max:200000,value:80000},
 {key:'withheld',label:'Employee payroll withholding',kind:'money',unit:9,min:1000,max:30000,value:10000},
 {key:'employerTax',label:'Employer payroll taxes',kind:'money',unit:9,min:1000,max:20000,value:6000},
 {key:'bonds',label:'Bonds issued at face value',kind:'money',unit:10,min:100000,max:3000000,value:1000000},
 {key:'bondRate',label:'Annual stated interest rate (%)',kind:'rate',unit:10,min:100,max:1200,value:600},
 {key:'shares',label:'New common shares issued',kind:'integer',unit:11,min:10,max:1000,value:100},
 {key:'par',label:'Par value per share',kind:'money',unit:11,min:100,max:10000,value:1000},
 {key:'issuePrice',label:'Issue price per share',kind:'money',unit:11,min:100,max:20000,value:1200},
 {key:'dividend',label:'Cash dividend declared',kind:'money',unit:11,min:1000,max:100000,value:20000}
];
export const defaultCourseParams=()=>Object.fromEntries(courseParameters.map(p=>[p.key,p.value]));
export type ActivityField={id:string;label:string;kind:'money'|'integer'|'ratio'|'percent'|'choice';options?:{value:string;label:string}[]};
export type ActivityData={kind:'journal'|'analysis'|'inventory'|'reconciliation'|'classification'|'ratios'|'statements'|'statement';statement?:StatementSpec;intro:string;fields:ActivityField[];table?:{headers:string[];rows:(string|number)[][]};lesson:{title:string;intro:string;concepts:string[];example:{story:string;steps:string[]}}};
export type StatementSpec={company:string;reportDate:string;periodStart:string;rowCount:number;sections:string[];labels:{id:string;name:string}[];titles:string[];sourceNote:string};
export type StatementAnswer={company:string;title:string;basis:string;date:string;rows:{label:string;section:string;amount:string}[]};
