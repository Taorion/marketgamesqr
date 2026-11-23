import {readFile} from 'node:fs/promises';
const p=JSON.parse(await readFile(process.argv[2],'utf8'));
const fields=['invoices','bytesPerInvoice','monthsRetained','replicationFactor','cpuSecondsPerInvoice','cpuPricePerHour','storagePricePerGBMonth','egressGB','egressPricePerGB','fixedMonthly'];
for(const k of fields)if(!Number.isFinite(p[k])||p[k]<0)throw new Error('Invalid '+k);
if(!p.invoices)throw new Error('invoices must be positive');
const cpu=p.invoices*p.cpuSecondsPerInvoice/3600*p.cpuPricePerHour;
const storage=p.invoices*p.bytesPerInvoice*p.monthsRetained*p.replicationFactor/1e9*p.storagePricePerGBMonth;
const egress=p.egressGB*p.egressPricePerGB,total=cpu+storage+egress+p.fixedMonthly;
console.log(JSON.stringify({cpu,storage,egress,fixed:p.fixedMonthly,total,perInvoice:total/p.invoices,excludes:['KYC','support','legal','taxes']},null,2));
