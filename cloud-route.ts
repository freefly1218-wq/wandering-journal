import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {journalAPI} from '../../../../lib/journal-api.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){return journalAPI(request,{db:env.DB,bucket:env.BUCKET,user:await getChatGPTUser(),ownerEmail:env.OWNER_EMAIL});}
export {handle as GET,handle as POST,handle as PUT,handle as DELETE};
