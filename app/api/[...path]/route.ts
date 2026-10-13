import { NextRequest,NextResponse } from 'next/server';
import { aw,staff,list,collectionPath,audit,ApiError,query } from '@/lib/appwrite';
import { can,unpack } from '@/lib/model';
import { validatePayload,contentSchema,formSchema,requestSchema,accessSchema,isContent } from '@/lib/validation';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function protectedWrite(req:NextRequest){const origin=req.headers.get('origin');if(!process.env.SITE_URL||origin!==new URL(process.env.SITE_URL).origin)throw new ApiError(403,'Origin check failed');}
async function captcha(token:string){if(!process.env.TURNSTILE_SECRET_KEY||!token)throw new ApiError(503,'Security verification is not configured');const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token})}).then(r=>r.json());if(!verify.success||verify.hostname!==new URL(process.env.SITE_URL!).hostname)throw new ApiError(400,'Please complete the security check again.');}
async function cooldown(identity:string,seconds:number){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity+Math.floor(Date.now()/(seconds*1000))));const id=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);try{await aw(collectionPath('rate_limits'),{method:'POST',body:JSON.stringify({documentId:id,data:{title:'cooldown',slug:id,status:'private',order:0,featured:false,payload:'{}'},permissions:[]})});}catch(e){if(e instanceof ApiError&&e.status===409)throw new ApiError(429,'Too many attempts. Please wait before trying again.');throw e;}}
async function handle(req:NextRequest,context:{params:Promise<{path:string[]}>}){try{
 const {path}=await context.params;const [area,kind,id]=path;const method=req.method;
 if(method!=='GET')await protectedWrite(req);
 if(area==='session'){
  if(method==='GET'){const u=await staff();return json({id:u.id,name:u.name,labels:u.labels});}
  if(method==='POST'){const {email,password,turnstileToken:loginToken}=await req.json();if(typeof email!=='string'||typeof password!=='string'||email.length>180||password.length>256)throw new ApiError(400,'Invalid credentials');
   await captcha(loginToken);
   await cooldown('login:'+email.toLowerCase(),30);
   const keyed=await aw('/account/sessions/email',{method:'POST',body:JSON.stringify({email,password})});
   const account=await aw('/account',{},keyed.secret);const user=await aw(`/users/${account.$id}`);if(!user.labels.some((x:string)=>can([x],'content')||can([x],'requests'))){await aw('/account/sessions/current',{method:'DELETE'},keyed.secret);throw new ApiError(403,'Staff access is required');}
   const res=json({ok:true});res.cookies.set('hospital_session',keyed.secret,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.min(28800,Math.max(0,(Date.parse(keyed.expire)-Date.now())/1000))});return res;
  }
  if(method==='DELETE'){const u=await staff();await aw('/account/sessions/current',{method:'DELETE'},u.secret);const res=json({ok:true});res.cookies.delete('hospital_session');return res;}
 }
 if(area==='submit'&&method==='POST'&&['appointments','enquiries'].includes(kind)){
  const data=formSchema.parse(await req.json());if(kind==='appointments'&&!data.date)throw new ApiError(400,'Choose a preferred date');if(!process.env.TURNSTILE_SECRET_KEY)throw new ApiError(503,'Online requests are not configured. Please phone the hospital.');
  await captcha(data.turnstileToken);await cooldown('form:'+data.phone.replace(/\D/g,'')+data.email.toLowerCase(),600);
  if(data.department){const d=await aw(`${collectionPath('departments')}/${data.department}`);if(d.status!=='published')throw new ApiError(400,'Select a published department');}
  if(data.doctor){const d=await aw(`${collectionPath('doctors')}/${data.doctor}`);if(d.status!=='published'||(data.department&&unpack(d).department!==data.department))throw new ApiError(400,'Select a doctor in the chosen department');}
  const {turnstileToken,website,...details}=data;await aw(collectionPath(kind),{method:'POST',body:JSON.stringify({documentId:crypto.randomUUID(),data:{title:data.name,slug:crypto.randomUUID(),status:'New',order:0,featured:false,payload:JSON.stringify({...details,notes:'',unread:true})},permissions:[]})});return json({ok:true},201);
 }
 const user=await staff();
 if(area==='access'){
  if(!user.labels.includes('hospital-admin'))throw new ApiError(403,'Administrator access required');
  if(method==='GET')return json(await aw('/users?queries[]='+encodeURIComponent(query('limit',undefined,[100]))));
  if(method==='PATCH'){const v=accessSchema.parse(await req.json());if(v.userId===user.id)throw new ApiError(400,'You cannot change your own access');await audit(user.id,'access-change',v.userId);await aw(`/users/${v.userId}/labels`,{method:'PUT',body:JSON.stringify({labels:v.labels})});return json({ok:true});}
 }
 if(area==='media'){
  if(!can(user.labels,'content'))throw new ApiError(403,'Content access required');const bucket=process.env.APPWRITE_PUBLIC_BUCKET_ID;
  if(method==='GET')return json(await aw(`/storage/buckets/${bucket}/files`));
  if(method==='POST'){const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new ApiError(400,'Upload JPG, PNG, WebP or PDF under 5 MB');const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());const valid=(file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216)||(file.type==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))||(file.type==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')||(file.type==='application/pdf'&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-');if(!valid)throw new ApiError(400,'File contents do not match its type');const body=new FormData();body.set('fileId',crypto.randomUUID());body.set('file',file);body.append('permissions[]','read("any")');const result=await aw(`/storage/buckets/${bucket}/files`,{method:'POST',body});await audit(user.id,'media-upload',result.$id);return json(result,201);}
  if(method==='DELETE'&&kind){await audit(user.id,'media-delete',kind);await aw(`/storage/buckets/${bucket}/files/${kind}`,{method:'DELETE'});return json({ok:true});}
 }
 if(area==='content'||area==='requests'){
  const valid=area==='content'?isContent(kind):['appointments','enquiries','audit_logs'].includes(kind);if(!valid)throw new ApiError(404,'Unknown collection');
  if(kind==='audit_logs'?!user.labels.includes('hospital-admin'):!can(user.labels,area))throw new ApiError(403,'Your role does not allow this operation');
  if(method==='GET'){if(id)return json(await aw(`${collectionPath(kind)}/${id}`));const offset=Math.max(0,Number(req.nextUrl.searchParams.get('offset'))||0);return json(await list(kind,false,100,offset));}
  if(area==='requests'&&method==='PATCH'&&id&&kind!=='audit_logs'){const v=requestSchema.parse(await req.json());const previous=await aw(`${collectionPath(kind)}/${id}`);await audit(user.id,'request-update',`${kind}/${id}`);return json(await aw(`${collectionPath(kind)}/${id}`,{method:'PATCH',body:JSON.stringify({data:{status:v.status,payload:JSON.stringify({...unpack(previous),notes:v.notes,unread:v.unread??false})}})}));}
  if(area==='content'&&['POST','PATCH'].includes(method)){const v=contentSchema.parse(await req.json());const p=JSON.parse(v.payload);validatePayload(p,kind);if((p.image&&!p.imageAlt)||(p.heroImage&&!p.heroAlt))throw new ApiError(400,'Image description is required');if(kind==='settings'&&v.status!=='published')throw new ApiError(400,'Settings must remain published');if(['settings','pages','sections'].includes(kind)&&method==='POST'){const existing=await aw(`${collectionPath(kind)}?queries[]=${encodeURIComponent(query('equal','slug',[v.slug]))}`);if(existing.total)throw new ApiError(409,'This slug already exists');}
   if(kind==='services'||kind==='doctors'){if(p.department){await aw(`${collectionPath('departments')}/${p.department}`);} }
   await audit(user.id,`${method==='POST'?'create':'update'}-${v.status}`,`${kind}/${id||v.slug}`);return json(await aw(`${collectionPath(kind)}${id?'/'+id:''}`,{method:id?'PATCH':'POST',body:JSON.stringify({...(id?{}:{documentId:crypto.randomUUID()}),data:v,permissions:v.status==='published'?['read("any")']:[]})}),method==='POST'?201:200);
  }
  if(area==='content'&&method==='DELETE'&&id){if(!user.labels.includes('hospital-admin'))throw new ApiError(403,'Only administrators can permanently delete; editors can archive.');await audit(user.id,'delete',`${kind}/${id}`);await aw(`${collectionPath(kind)}/${id}`,{method:'DELETE'});return json({ok:true});}
 }
 throw new ApiError(405,'Operation not supported');
 }catch(e){if(e instanceof ApiError)return json({error:e.status>=500?'The service is unavailable. Check configuration or try again.':e.message},e.status);if(e&&typeof e==='object'&&'issues'in e)return json({error:(e as {issues:{message:string}[]}).issues.map(x=>x.message).join('; ')},400);console.error('Hospital operation failed',e instanceof Error?e.name:'unknown');return json({error:'Unable to complete the operation. Please try again.'},500);}}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
