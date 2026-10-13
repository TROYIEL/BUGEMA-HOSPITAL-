import 'server-only';
import { cookies } from 'next/headers';
import { Entry, kinds, defaultSettings } from './model';
export const configured=()=>Boolean(process.env.APPWRITE_ENDPOINT&&process.env.APPWRITE_PROJECT_ID&&process.env.APPWRITE_API_KEY&&process.env.APPWRITE_DATABASE_ID);
export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
export async function aw(path:string,init:RequestInit={},session?:string):Promise<any>{
 if(!configured())throw new ApiError(503,'Appwrite is not configured. Please contact the hospital by phone.');
 const headers:Record<string,string>={'X-Appwrite-Project':process.env.APPWRITE_PROJECT_ID!};
 if(session) headers['X-Appwrite-Session']=session; else headers['X-Appwrite-Key']=process.env.APPWRITE_API_KEY!;
 if(!(init.body instanceof FormData))headers['Content-Type']='application/json';
 const res=await fetch(`${process.env.APPWRITE_ENDPOINT}${path}`,{...init,headers:{...headers,...init.headers},cache:'no-store'});
 if(!res.ok){const error:any=await res.json().catch(()=>({}));throw new ApiError(res.status,error.message||'Appwrite operation failed');}
 return res.status===204?null:res.json();
}
export const collectionPath=(kind:string)=>`/databases/${process.env.APPWRITE_DATABASE_ID}/collections/${kind}/documents`;
export const query=(method:string,attribute?:string,values?:unknown[])=>JSON.stringify({method,...(attribute?{attribute}:{}),...(values?{values}:{})});
export async function list(kind:string,published=false,limit=100,offset=0){
 const qs=[query('limit',undefined,[limit]),query('offset',undefined,[offset]),query('orderAsc','order')];
 if(published)qs.push(query('equal','status',['published']));
 return aw(`${collectionPath(kind)}?${qs.map(q=>'queries[]='+encodeURIComponent(q)).join('&')}`);
}
export async function all(kind:string,published=false){let documents:Entry[]=[];for(let offset=0;;offset+=100){const r=await list(kind,published,100,offset);documents.push(...r.documents);if(r.documents.length<100)break;}return documents;}
export async function publicContent():Promise<Record<string,Entry[]>>{if(!configured())return Object.fromEntries(kinds.map(k=>[k,[]])) as Record<string,Entry[]>;return Object.fromEntries(await Promise.all(kinds.map(async k=>[k,await all(k,true)])));}
export async function settings(){if(!configured())return defaultSettings;const data=await list('settings',true);return {...defaultSettings,...JSON.parse(data.documents.find((e:Entry)=>e.slug==='hospital')?.payload||'{}')};}
export async function staff(){const secret=(await cookies()).get('hospital_session')?.value;if(!secret)throw new ApiError(401,'Please sign in.');const account=await aw('/account',{},secret);const user=await aw(`/users/${account.$id}`);return {id:user.$id,name:user.name,email:user.email,labels:user.labels as string[],secret};}
export async function audit(actor:string,action:string,target:string){await aw(collectionPath('audit_logs'),{method:'POST',body:JSON.stringify({documentId:crypto.randomUUID(),data:{title:action,slug:crypto.randomUUID(),status:'private',order:0,featured:false,payload:JSON.stringify({actor,target})},permissions:[]})});}
