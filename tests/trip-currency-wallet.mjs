import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const html=await readFile(new URL('../trip.html',import.meta.url),'utf8');
const extract=name=>html.match(new RegExp('// BEGIN_'+name+'([\\s\\S]*?)// END_'+name))[1];
const sandbox={};
new Script(extract('MONEY_ROUTE_HELPERS')+extract('FINANCE_HELPERS')+';this.h={currencyAmount,budgetEntries,budgetSummary,cashBalance,spendingSummary};').runInNewContext(sandbox);
const h=sandbox.h, clean=x=>JSON.parse(JSON.stringify(x));
export const results=[];
function check(name,fn){fn();results.push(name);}
check('VND whole units and decimal currencies are validated',()=>{
 assert.equal(h.currencyAmount('1,000,000','VND'),1000000);
 assert.equal(h.currencyAmount('1.5','VND'),null);
 assert.equal(h.currencyAmount('12.25','PHP'),12.25);
 assert.equal(h.currencyAmount('-1','USD'),null);
});
check('both legacy budget currencies survive without relabeling',()=>{
 assert.deepEqual(clean(h.budgetEntries({yen:1000,ntd:200})),[{cur:'JPY',amt:1000},{cur:'TWD',amt:200}]);
 assert.equal(h.budgetSummary([{yen:1000,ntd:200}],{JPY:0.2}).twd,400);
});
check('explicit budget wins, including a cleared budget',()=>{
 assert.deepEqual(clean(h.budgetEntries({budget:[],yen:1000,ntd:200})),[]);
 assert.deepEqual(clean(h.budgetEntries({budget:[{cur:'PHP',amt:100}],yen:1000})),[{cur:'PHP',amt:100}]);
});
check('four currency budget preserves originals and reports missing rates',()=>{
 const v=h.budgetSummary([{budget:[{cur:'PHP',amt:100},{cur:'TWD',amt:200},{cur:'USD',amt:10},{cur:'VND',amt:1000000}]}],{PHP:0.5,USD:32});
 assert.equal(v.twd,570);assert.deepEqual(clean(v.missing),['VND']);
 assert.equal(v.totals.VND,1000000);
});
check('cashflows and exchanges never inflate spending, including VND',()=>{
 const rows=[{kind:'cashflow',direction:'in',cur:'VND',amt:1000000},{kind:'exchange',cur:'USD',amt:40,toCur:'VND',toAmt:1000000},{kind:'expense',cur:'VND',amt:100000,actualTwd:130}];
 assert.deepEqual(clean(h.spendingSummary(rows,{})),{totals:{VND:100000},twd:130,missing:[],pending:0});
});
const snap={amount:200,at:'2027-01-01T00:00:00Z',includedIds:['old']};
const rows=[{id:'old',cur:'USD',amt:50,pay:'現金'}, {id:'cash',cur:'USD',amt:10.25,pay:'現金'}, {id:'card',cur:'USD',amt:20,pay:'刷卡'}, {id:'fx',kind:'exchange',cur:'USD',amt:100,toCur:'PHP',toAmt:5700}, {id:'in',kind:'cashflow',cur:'USD',amt:50,direction:'in'}, {id:'out',kind:'cashflow',cur:'USD',amt:5,direction:'out'}];
check('cash wallet uses physical count, cash and flows; cards do not deduct',()=>{
 assert.deepEqual(clean(h.cashBalance(snap,rows,'USD')),{amount:134.75,pending:0});
 assert.equal(h.cashBalance({amount:0,includedIds:[]},rows,'PHP').amount,5700);
 assert.equal(h.cashBalance(null,rows,'VND'),null);
});
check('editing or deleting a post-count row recomputes balances',()=>{
 assert.equal(h.cashBalance(snap,rows.filter(x=>x.id!=='cash'),'USD').amount,145);
 assert.equal(h.cashBalance(snap,rows.map(x=>x.id==='cash'?{...x,amt:30}:x),'USD').amount,115);
});
check('pre-count rows stay included after edits and backfills can be excluded',()=>{
 assert.equal(h.cashBalance(snap,rows.map(x=>x.id==='old'?{...x,amt:999}:x),'USD').amount,134.75);
 assert.equal(h.cashBalance(snap,[...rows,{id:'backfill',cur:'USD',amt:99,pay:'現金',cashIncluded:true}],'USD').amount,134.75);
});
check('recount establishes a new baseline without double deduction',()=>{
 const counted={amount:135,includedIds:rows.map(x=>x.id)};
 assert.equal(h.cashBalance(counted,rows,'USD').amount,135);
 assert.equal(h.cashBalance(counted,[...rows,{id:'next',cur:'USD',amt:5,pay:'現金'}],'USD').amount,130);
});
check('unknown payment or missing cash amount makes balance incomplete',()=>{
 const v=h.cashBalance(snap,[{id:'a',cur:'USD',amt:20,pay:'電子支付（待確認）'},{id:'b',cur:'USD',amt:null,pay:'現金'}],'USD');
 assert.deepEqual(clean(v),{amount:200,pending:2});
});
check('VND exchanges and negative balances remain explicit',()=>{
 const v=h.cashBalance({amount:0,includedIds:[]},[{id:'fx',kind:'exchange',cur:'USD',amt:40,toCur:'VND',toAmt:1000000},{id:'e',cur:'VND',amt:1200000,pay:'現金'}],'VND');
 assert.deepEqual(clean(v),{amount:-200000,pending:0});
});
check('JSON backup roundtrip preserves wallet snapshots and money semantics',()=>{
 const data={private:{infoHtml:'retained',wallet:{snapshots:{USD:snap}}},data:{items:[{budget:[{cur:'VND',amt:1000000}]}],misc:rows}};
 const before=JSON.stringify(data), copy=JSON.parse(before);
 assert.equal(h.cashBalance(copy.private.wallet.snapshots.USD,copy.data.misc,'USD').amount,134.75);
 assert.equal(h.budgetSummary(copy.data.items,{VND:0.0013}).twd,1300);
 assert.equal(JSON.stringify(data),before);
});
console.log(results.length+' currency and wallet checks passed');
