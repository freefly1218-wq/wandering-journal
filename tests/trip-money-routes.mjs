import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const html = await readFile(new URL('../trip.html', import.meta.url), 'utf8');
const block = html.match(/\/\/ BEGIN_MONEY_ROUTE_HELPERS([\s\S]*?)\/\/ END_MONEY_ROUTE_HELPERS/)[1];
const sandbox = {};
new Script(block + '; this.h = {dayLocations,routeText,decimalAmount,effectiveRate,spendingSummary};').runInNewContext(sandbox);
const h = sandbox.h;
const clean = x => JSON.parse(JSON.stringify(x));
export const results=[];
function check(name, fn) { fn(); results.push(name); }
check('legacy single-place days and ordered multi-place routes survive',()=>{
 assert.deepEqual(clean(h.dayLocations({region:'a'})),['a']);
 assert.equal(h.routeText({region:'a',locations:['b','a','c']},{a:{name:'克拉克'},b:{name:'碧瑤'},c:{name:'馬尼拉'}}),'碧瑤 → 克拉克 → 馬尼拉');
 assert.deepEqual(clean(h.dayLocations({region:'a',locations:[]})),[]);
});
check('decimal cents preserved; invalid, negative and nonfinite input rejected',()=>{
 assert.equal(h.decimalAmount('1,234.56'),1234.56); assert.equal(h.decimalAmount('0.50'),0.5);
 for (const s of ['', '-1','1.234','Infinity','NaN','abc','1e3']) assert.equal(h.decimalAmount(s),null);
});
check('exchange derives transaction rate and never counts as spending',()=>{
 assert.equal(h.effectiveRate(100,5750),57.5);
 for(const n of [0,-1,Infinity,null]) assert.equal(h.effectiveRate(n,5750),null);
 const v=clean(h.spendingSummary([{kind:'exchange',cur:'USD',amt:100,toCur:'PHP',toAmt:5750}],{USD:32,PHP:0.56}));
 assert.deepEqual(v,{totals:{},twd:0,missing:[],pending:0});
});
check('USD PHP TWD retained separately, payment does not affect totals',()=>{
 const rows=[{amt:10.25,cur:'USD',pay:'現金'},{amt:200.5,cur:'PHP',pay:'刷卡'},{amt:100,cur:'TWD'}];
 const v=clean(h.spendingSummary(rows,{USD:32,PHP:0.56}));
 assert.deepEqual(v.totals,{USD:10.25,PHP:200.5,TWD:100}); assert.ok(Math.abs(v.twd-540.28)<1e-8);
});
check('actual TWD overrides estimate exactly once including zero',()=>{
 assert.equal(h.spendingSummary([{cur:'PHP',amt:100,actualTwd:60}],{PHP:0.5}).twd,60);
 assert.equal(h.spendingSummary([{cur:'USD',amt:1,actualTwd:0}],{USD:32}).twd,0);
});
check('missing rates and unfilled spending are explicit, not silently zero',()=>{
 const v=clean(h.spendingSummary([{cur:'USD',amt:100},{cur:'PHP',amt:20},{cur:'PHP',amt:null},{cur:'TWD',amt:10}],{PHP:0.5}));
 assert.equal(v.twd,20);assert.deepEqual(v.missing,['USD']);assert.equal(v.pending,1);
});
check('legacy JPY preserved and fees count only as independent expenses',()=>{
 const v=h.spendingSummary([{amt:100,cur:'JPY'},{kind:'exchange',amt:100,cur:'USD',toAmt:5700,toCur:'PHP'},{kind:'expense',amt:2,cur:'USD',label:'手續費'}],{JPY:0.2,USD:32});
 assert.equal(v.twd,84);assert.equal(v.totals.USD,2);
});
check('calculating summaries never rewrites stored amounts or exchange records',()=>{
 const rows=[{kind:'expense',amt:3.15,cur:'USD'},{kind:'exchange',amt:100,cur:'USD',toAmt:5750,toCur:'PHP'}];
 const rates={USD:32}; const before=JSON.stringify({rows,rates});
 h.spendingSummary(rows,rates); h.spendingSummary(rows,rates);
 assert.equal(JSON.stringify({rows,rates}),before);
});
console.log(results.length+' money and route checks passed');
