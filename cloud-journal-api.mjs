const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const pathOK=p=>typeof p==='string'&&p.length<250&&/^(items|misc|split|todos|meta|private|notes|data)\/[A-Za-z0-9_~:@+./-]+$/.test(p)&&!p.includes('..')&&!p.includes('//');
const idOK=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(s);
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof s==='string'?new TextEncoder().encode(s):s)),x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o&&Object.hasOwn(o,k)).map(k=>[k,o[k]]));
export function publicItinerary(docs,includeNotes=false){
  const map=Object.fromEntries(docs.filter(d=>!d.deleted).map(d=>[d.path,typeof d.value==='string'?JSON.parse(d.value):d.value]));
  const c=map['meta/config']||{}, plans=map['meta/plans']||{};
  const config=pick(c,['title','start','timezone']);
  config.days=(c.days||[]).map(d=>pick(d,['region','locations','overnight','theme']));
  config.regions=Object.fromEntries(Object.entries(c.regions||{}).map(([k,r])=>[k,pick(r,['name','tone'])]));
  config.segments=(c.segments||[]).map(s=>pick(s,['id','name','startDay']));
  const items=Object.entries(map).filter(([p,v])=>p.startsWith('items/')&&(!['A','B'].includes(v.plan)||v.plan===(plans[v.day]||'A'))).map(([p,v])=>({id:p.slice(6),...pick(v,['day','time','end','title','cat','move',...(includeNotes?['note']:[])])}));
  return {config,items};
}
export async function journalAPI(request,{db,bucket,user,ownerEmail}){
  try {
    const url=new URL(request.url), route=url.pathname.replace(/^\/api\/journal\/?/,'');
    const method=request.method;
    if(!['GET','HEAD'].includes(method)&&request.headers.get('origin')!==url.origin)return json({error:'來源不符，請從旅行日誌操作。'},403);
    if(route==='share/view'&&method==='POST'){
      const {token:t}=await request.json();if(!idOK(t))return json({error:'分享連結無效或已到期。'},404);
      const share=await db.prepare('SELECT * FROM journal_shares WHERE token_hash=? AND revoked=0 AND expires>?').bind(await hash(t),new Date().toISOString()).first();
      if(!share)return json({error:'分享連結無效、已撤銷或已到期。'},404);
      const rows=await db.prepare("SELECT path,value,deleted FROM journal_documents WHERE owner=? AND deleted=0 AND (path='meta/config' OR path='meta/plans' OR path LIKE 'items/%') LIMIT 5001").bind(share.owner).all();
      if(rows.results.length>5000)return json({error:'行程過大，請聯絡分享者。'},413);
      return json({...publicItinerary(rows.results,!!share.notes),expires:share.expires});
    }
    if(!user)return json({error:'請登入 ChatGPT。',login:true},401);
    if(!ownerEmail||user.email?.toLowerCase()!==ownerEmail.toLowerCase())return json({error:'此私人日誌只允許擁有者編輯。'},403);
    const owner=user.userId;
    if(route==='session'&&method==='GET')return json({userId:owner,displayName:user.displayName||'我',version:1});
    if(route==='changes'&&method==='GET'){
      const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return json({error:'無效同步位置。'},400);
      const rows=await db.prepare('SELECT path,value,revision,seq,deleted FROM journal_documents WHERE owner=? AND seq>? ORDER BY seq LIMIT 201').bind(owner,after).all();
      const docs=rows.results.slice(0,200).map(d=>({...d,value:d.value===null?null:JSON.parse(d.value)}));
      return json({docs,cursor:docs.at(-1)?.seq||after,more:rows.results.length>200});
    }
    if(route==='document'&&method==='GET'){
      const path=url.searchParams.get('path');if(!pathOK(path))return json({error:'無效路徑。'},400);
      const d=await db.prepare('SELECT path,value,revision,seq,deleted FROM journal_documents WHERE owner=? AND path=?').bind(owner,path).first();
      return json(d?{...d,value:d.value===null?null:JSON.parse(d.value)}:{path,value:null,revision:0,seq:0,deleted:1});
    }
    if(route==='push'&&method==='POST'){
      if(Number(request.headers.get('content-length')||0)>300000)return json({error:'此筆資料太大。'},413);
      const op=await request.json();const value=op.deleted?null:JSON.stringify(op.value);
      if(!pathOK(op.path)||!idOK(op.id)||!Number.isSafeInteger(op.base)||op.base<0||(!op.deleted&&(!op.value||typeof op.value!=='object'||Array.isArray(op.value)))||value?.length>250000)return json({error:'無效同步資料。'},400);
      const result=await db.batch([
        db.prepare('INSERT INTO journal_clocks(owner,value) VALUES(?,0) ON CONFLICT DO NOTHING').bind(owner),
        db.prepare('INSERT INTO journal_receipts(owner,op,result) VALUES(?,?,NULL) ON CONFLICT DO NOTHING').bind(owner,op.id),
        db.prepare(`INSERT INTO journal_documents(owner,path,value,revision,seq,deleted,last_op)
          SELECT ?,?,?,1,(SELECT value+1 FROM journal_clocks WHERE owner=?),?,?
          WHERE ?=0 AND NOT EXISTS(SELECT 1 FROM journal_receipts WHERE owner=? AND op=? AND result IS NOT NULL)
          ON CONFLICT(owner,path) DO UPDATE SET value=excluded.value,revision=journal_documents.revision+1,seq=excluded.seq,deleted=excluded.deleted,last_op=excluded.last_op
          WHERE journal_documents.revision=? AND NOT EXISTS(SELECT 1 FROM journal_receipts WHERE owner=? AND op=? AND result IS NOT NULL)`).bind(owner,op.path,value,owner,op.deleted?1:0,op.id,op.base,owner,op.id,op.base,owner,op.id),
        // Existing rows with base>0 need the UPDATE path; INSERT SELECT must run for them too.
        db.prepare(`UPDATE journal_documents SET value=?,revision=revision+1,seq=(SELECT value+1 FROM journal_clocks WHERE owner=?),deleted=?,last_op=?
          WHERE owner=? AND path=? AND revision=? AND last_op<>? AND NOT EXISTS(SELECT 1 FROM journal_receipts WHERE owner=? AND op=? AND result IS NOT NULL)`).bind(value,owner,op.deleted?1:0,op.id,owner,op.path,op.base,op.id,owner,op.id),
        db.prepare(`UPDATE journal_receipts SET result=json_object('ok',EXISTS(SELECT 1 FROM journal_documents WHERE owner=? AND path=? AND last_op=?),'revision',COALESCE((SELECT revision FROM journal_documents WHERE owner=? AND path=?),0)) WHERE owner=? AND op=? AND result IS NULL`).bind(owner,op.path,op.id,owner,op.path,owner,op.id),
        db.prepare('UPDATE journal_clocks SET value=MAX(value,COALESCE((SELECT MAX(seq) FROM journal_documents WHERE owner=?),0)) WHERE owner=?').bind(owner,owner),
        db.prepare('SELECT result FROM journal_receipts WHERE owner=? AND op=?').bind(owner,op.id)
      ]);
      return json(JSON.parse(result.at(-1).results[0].result));
    }
    if(route==='assets'&&method==='GET'){
      const r=await db.prepare('SELECT id,sha,bytes,mime FROM journal_assets WHERE owner=? AND deleted=0 LIMIT 2001').bind(owner).all();
      if(r.results.length>2000)return json({error:'照片數超過本版同步上限。'},413);return json({assets:r.results});
    }
    if(route.startsWith('assets/')){
      const id=route.slice(7);if(!/^[0-9a-f]{16,64}$/.test(id))return json({error:'無效附件。'},400);
      const existing=await db.prepare('SELECT * FROM journal_assets WHERE owner=? AND id=?').bind(owner,id).first();
      if(method==='GET'){
        if(!existing)return json({error:'附件不存在。'},404);const obj=await bucket.get(existing.object_key);if(!obj)return json({error:'附件尚未上傳完成。'},404);
        return new Response(obj.body,{headers:{'Content-Type':existing.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment'}});
      }
      if(method==='PUT'){
        const bytes=await request.arrayBuffer();if(bytes.byteLength>20*1024*1024)return json({error:'每個附件上限為 20 MB。'},413);
        const sha=await hash(bytes),mime=request.headers.get('content-type')||'application/octet-stream';
        if(existing&&existing.sha!==sha)return json({error:'附件 ID 已存在且內容不同。'},409);
        const key=owner+'/'+id+'/'+sha;await bucket.put(key,bytes,{httpMetadata:{contentType:mime}});
        await db.prepare('INSERT INTO journal_assets(owner,id,object_key,sha,bytes,mime,deleted) VALUES(?,?,?,?,?,?,0) ON CONFLICT(owner,id) DO UPDATE SET deleted=0 WHERE sha=excluded.sha').bind(owner,id,key,sha,bytes.byteLength,mime).run();return json({id,sha});
      }
      if(method==='DELETE'){await db.prepare('UPDATE journal_assets SET deleted=1 WHERE owner=? AND id=?').bind(owner,id).run();return json({ok:true});}
    }
    if(route==='shares'&&method==='GET')return json({shares:(await db.prepare('SELECT id,created,expires,revoked,notes FROM journal_shares WHERE owner=? ORDER BY created DESC LIMIT 50').bind(owner).all()).results});
    if(route==='shares/preview'&&method==='GET'){
      const rows=await db.prepare('SELECT path,value,deleted FROM journal_documents WHERE owner=? AND deleted=0 LIMIT 5001').bind(owner).all();return json(publicItinerary(rows.results,url.searchParams.get('notes')==='1'));
    }
    if(route==='shares'&&method==='POST'){
      const opts=await request.json(),t=token(),id=crypto.randomUUID(),created=new Date().toISOString(),expires=new Date(Date.now()+7*86400000).toISOString();
      await db.prepare('INSERT INTO journal_shares(id,owner,token_hash,created,expires,notes) VALUES(?,?,?,?,?,?)').bind(id,owner,await hash(t),created,expires,opts.notes===true?1:0).run();return json({id,token:t,expires});
    }
    if(route.startsWith('shares/')&&method==='DELETE'){
      await db.prepare('UPDATE journal_shares SET revoked=1 WHERE owner=? AND id=?').bind(owner,route.slice(7)).run();return json({ok:true});
    }
    return json({error:'找不到此功能。'},404);
  }catch(e){return json({error:'雲端暫時無法完成操作，資料仍保留於裝置，請稍後重試。'},500);}
}
