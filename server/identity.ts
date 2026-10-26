import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
export type TrustedPlayer={accountId:string;uid:string;username:string;displayName:string;avatar:number;expiresAt:number};
export type MatchSummary={id:string;outcome:'blue'|'orange'|'draw';kind:'completed'|'abandoned'|'practice';players:{accountId:string;team:'blue'|'orange';kills:number;deaths:number}[]};
export interface IdentityService {verify(token:string):Promise<TrustedPlayer>;ready():Promise<boolean>;invite(sender:string,recipient:string,room:{code:string;instance:string;size:number}):Promise<string>;readInvite(id:string,recipient:string):Promise<{code:string;instance:string;sender:string}>;consumeInvite(id:string,recipient:string):Promise<void>;closeInvites(instance:string):Promise<void>;record(summary:MatchSummary):Promise<void>;}
const boundedFetch:typeof fetch=(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000)});
export class SupabaseIdentity implements IdentityService {
 client:SupabaseClient;constructor(url:string,key:string){this.client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:boundedFetch}});}
 private async rpc(name:string,args:Record<string,unknown>){const {data,error}=await this.client.rpc(name,args);if(error)throw Error(error.message?.match(/INVITATION_EXPIRED|NOT_FRIENDS|RATE_LIMIT|RESULT_CONFLICT/)?.[0]||'ACCOUNT_SERVICE_UNAVAILABLE');return data;}
 async ready(){const {error}=await this.client.from('player_profiles').select('account_id',{head:true,count:'exact'});return !error;}
 async verify(token:string){if(typeof token!=='string'||token.length<20||token.length>8192)throw Error('AUTH_REQUIRED');const {data,error}=await this.client.auth.getUser(token);if(error||!data.user){console.warn('BLACKOUT AUTH_VERIFY_REJECTED',error?.code||'NO_USER',error?.status||0);throw Error('AUTH_INVALID');}const {data:profile,error:failure}=await this.client.from('player_profiles').select('account_id,player_uid,username,display_name,avatar').eq('account_id',data.user.id).single();if(failure||!profile)throw Error('PROFILE_REQUIRED');let exp=0;try{exp=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).exp*1000;}catch{}if(!Number.isFinite(exp)||exp<=Date.now())throw Error('AUTH_EXPIRED');return {accountId:data.user.id,uid:profile.player_uid,username:profile.username,displayName:profile.display_name,avatar:profile.avatar,expiresAt:exp};}
 async invite(sender:string,recipient:string,room:{code:string;instance:string;size:number}){return await this.rpc('server_invite',{p_sender:sender,p_recipient:recipient,p_code:room.code,p_instance:room.instance,p_format:room.size}) as string;}
 async readInvite(id:string,recipient:string){return await this.rpc('server_read_invitation',{p_id:id,p_recipient:recipient}) as {code:string;instance:string;sender:string};}
 async consumeInvite(id:string,recipient:string){await this.rpc('server_consume_invitation',{p_id:id,p_recipient:recipient});}
 async closeInvites(instance:string){await this.rpc('server_close_invites',{p_instance:instance});}
 async record(s:MatchSummary){await this.rpc('server_record_match',{p_match:s.id,p_outcome:s.outcome,p_kind:s.kind,p_players:s.players});}
}
export class ResultOutbox {
 pending:MatchSummary[]=[];private fileWork=Promise.resolve();private flight?:Promise<void>;private loadFailed=false;healthy=true;
 constructor(private service:IdentityService,private path:string){}
 async load(){try{const values=JSON.parse(await readFile(this.path,'utf8'));if(!Array.isArray(values)||values.length>256)throw Error('INVALID_OUTBOX');this.pending=values;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT'){this.loadFailed=true;this.healthy=false;console.error('BLACKOUT STATS_OUTBOX_UNAVAILABLE');}}}
 private save(){this.fileWork=this.fileWork.catch(()=>{}).then(async()=>{await mkdir(dirname(this.path),{recursive:true});await writeFile(this.path+'.tmp',JSON.stringify(this.pending),{mode:0o600});await rename(this.path+'.tmp',this.path);});return this.fileWork;}
 async add(s:MatchSummary){if(s.players.length<2)return;if(this.pending.some(p=>p.id===s.id))return;if(this.pending.length>=256){this.healthy=false;console.error('BLACKOUT STATS_OUTBOX_FULL');return;}this.pending.push(s);try{await this.save();}catch{this.healthy=false;console.error('BLACKOUT STATS_OUTBOX_UNAVAILABLE');}void this.flush();}
 flush(){if(this.flight)return this.flight;if(this.loadFailed)return Promise.resolve();this.flight=(async()=>{try{while(this.pending.length){await this.service.record(this.pending[0]);this.pending.shift();await this.save();}this.healthy=true;}catch{console.warn('BLACKOUT STATS_RETRY_PENDING');}})().finally(()=>{this.flight=undefined;});return this.flight;}
 async close(){await this.flight;await this.fileWork.catch(()=>{});}
}
