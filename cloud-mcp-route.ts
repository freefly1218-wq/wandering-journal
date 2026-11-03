import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../chatgpt-auth';
import {collaborationTool,collaborationTools} from '../../lib/journal-collaboration.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  let call:any;
  const response=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  try{
    if(Number(request.headers.get('content-length')||0)>700000)return response({error:'Request too large'},413);
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Origin mismatch'},403);
    call=await request.json();if(call.jsonrpc!=='2.0'||typeof call.method!=='string')return response({jsonrpc:'2.0',id:call.id??null,error:{code:-32600,message:'Invalid Request'}});
    const result=(value:any)=>response({jsonrpc:'2.0',id:call.id??null,result:value});
    if(call.method==='server/discover')return result({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
    if(call.method==='initialize')return result({protocolVersion:'2026-07-28',capabilities:{tools:{}},serverInfo:{name:'wandering-journal',version:'1.0.0'}});
    if(call.method==='notifications/initialized')return new Response(null,{status:204});
    if(call.method==='ping')return result({});
    if(call.method==='tools/list')return result({tools:collaborationTools});
    if(call.method!=='tools/call')return response({jsonrpc:'2.0',id:call.id??null,error:{code:-32601,message:'Method not found'}});
    if(!collaborationTools.some(t=>t.name===call.params?.name))return result({isError:true,content:[{type:'text',text:'Unknown tool'}]});
    const data=await collaborationTool(call.params.name,call.params.arguments,{db:env.DB,user:await getChatGPTUser(),ownerEmail:env.OWNER_EMAIL});return result({content:[{type:'text',text:JSON.stringify(data)}]});
  }catch(e:any){return response({jsonrpc:'2.0',id:call?.id??null,result:{isError:true,content:[{type:'text',text:e?.status?e.message:'協作暫時無法完成，未確認成功前請勿宣稱已更新。'}]}});}
}
