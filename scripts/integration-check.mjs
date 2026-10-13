// Uses an isolated in-memory Appwrite stand-in, not production data.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const store={};let uploads=0;
const backend=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');let body='';for await(const chunk of req)body+=chunk;const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
if(url.pathname==='/v1/account'){const id=req.headers['x-appwrite-session'];if(!id)return send(401,{message:'No session'});return send(200,{$id:id});}
if(url.pathname.startsWith('/v1/users/')){const id=url.pathname.split('/').pop();return send(200,{$id:id,name:id,email:id+'@example.test',labels:id==='admin'?['hospital-admin']:id==='editor'?['hospital-editor']:id==='handler'?['hospital-requests']:[]});}
if(url.pathname.includes('/storage/')){if(req.method==='POST'){uploads++;return send(201,{$id:'media-'+uploads,name:'test.png'});}return send(200,{files:[]});}
const match=url.pathname.match(/\/collections\/([^/]+)\/documents(?:\/([^/]+))?/);if(!match)return send(404,{message:'Unknown'});const [,kind,id]=match;store[kind]??={};const rows=store[kind];const data=body?JSON.parse(body):{};
if(req.method==='POST'){const doc={$id:data.documentId,$createdAt:new Date().toISOString(),$updatedAt:new Date().toISOString(),...data.data,$permissions:data.permissions};rows[doc.$id]=doc;return send(201,doc);}
if(req.method==='PATCH'){if(!rows[id])return send(404,{message:'missing'});rows[id]={...rows[id],...data.data,...(data.permissions?{$permissions:data.permissions}:{}),$updatedAt:new Date().toISOString()};return send(200,rows[id]);}
if(req.method==='DELETE'){delete rows[id];return send(204,{});}
if(id)return rows[id]?send(200,rows[id]):send(404,{message:'missing'});
let documents=Object.values(rows);for(const q of url.searchParams.getAll('queries[]')){const v=JSON.parse(q);if(v.method==='equal')documents=documents.filter(d=>v.values.includes(d[v.attribute]));}return send(200,{documents,total:documents.length});});
await new Promise(r=>backend.listen(3219,'127.0.0.1',r));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3220'],{env:{...process.env,APPWRITE_ENDPOINT:'http://127.0.0.1:3219/v1',APPWRITE_PROJECT_ID:'test',APPWRITE_API_KEY:'test-fixture-not-a-secret',APPWRITE_DATABASE_ID:'test',APPWRITE_PUBLIC_BUCKET_ID:'test',SITE_URL:'http://127.0.0.1:3220',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});
const base='http://127.0.0.1:3220';
async function api(path,method='GET',body,user='admin'){const headers={Origin:base,Cookie:'hospital_session='+user};if(!(body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(base+'/api/'+path,{method,headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
try{
let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/session',{headers:{Cookie:'hospital_session=admin'}});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Next test server starts');
assert.equal((await api('requests/appointments','GET',null,'editor')).status,403);assert.equal((await api('content/departments','GET',null,'handler')).status,403);assert.equal((await api('access','PATCH',{userId:'other',labels:[]},'editor')).status,403);
assert.equal((await fetch(base+'/api/content/departments')).status,401);
const draft={title:'TEST Department',slug:'test-department',status:'draft',order:0,featured:true,payload:JSON.stringify({body:'Test only',imageAlt:''})};const created=await api('content/departments','POST',draft,'editor');assert.equal(created.status,201);const id=created.data.$id;assert.deepEqual(created.data.$permissions,[]);
let page=await fetch(base+'/departments').then(r=>r.text());assert(!page.includes('TEST Department'),'Draft hidden on public list');
const published=await api('content/departments/'+id,'PATCH',{...draft,status:'published'},'editor');assert.equal(published.status,200);assert.deepEqual(published.data.$permissions,['read("any")']);page=await fetch(base+'/departments').then(r=>r.text());assert(page.includes('TEST Department'),'Published content appears');assert.equal((await fetch(base+'/departments/test-department')).status,200);
assert.equal((await api('content/departments/'+id,'DELETE',null,'editor')).status,403);
await api('content/departments/'+id,'PATCH',draft,'editor');const hidden=await fetch(base+'/departments/test-department').then(r=>r.text());assert(hidden.includes('Page not found'),'Unpublished detail renders not-found state');
assert.equal((await api('content/departments','POST',{...draft,slug:'bad',payload:JSON.stringify({image:'javascript:alert(1)',imageAlt:'test'})})).status,400);
const f=new FormData();f.set('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'}),'test.png');assert.equal((await api('media','POST',f,'editor')).status,201);
const bad=new FormData();bad.set('file',new Blob(['malicious'],{type:'image/png'}),'bad.png');assert.equal((await api('media','POST',bad,'editor')).status,400);assert.equal((await api('media','POST',f,'handler')).status,403);
const submission=await api('submit/appointments','POST',{name:'Test Patient',phone:'0700000000',email:'',department:'',doctor:'',date:'2099-01-01',message:'',website:'',turnstileToken:'fixture',consent:true});assert.equal(submission.status,503,'Forms fail closed without Turnstile secret');assert.equal((await api('submit/appointments','POST',{name:'x'})).status,400);
store.appointments={request:{$id:'request',title:'Test Patient',slug:'request',status:'New',order:0,featured:false,payload:JSON.stringify({name:'Test Patient',phone:'0700000000',notes:'',unread:true})}};const update=await api('requests/appointments/request','PATCH',{status:'Confirmed',notes:'Called test patient'},'handler');assert.equal(update.status,200);assert.equal(update.data.status,'Confirmed');assert.equal(JSON.parse(update.data.payload).notes,'Called test patient');assert.equal(JSON.parse(update.data.payload).unread,false);
assert.equal((await fetch(base+'/api/content/departments',{method:'POST',headers:{Origin:'https://evil.example',Cookie:'hospital_session=admin','Content-Type':'application/json'},body:JSON.stringify(draft)})).status,403);
assert(Object.keys(store.audit_logs).length>=4,'Important operations audited');
console.log('PASS: Next.js HTTP integration checks — role isolation, CRUD, draft/public permissions, detail 404, URL validation, upload signatures, request review, Origin protection and fail-closed submissions. Appwrite and Turnstile live connections remain unverified.');
}finally{child.kill('SIGTERM');backend.close();}
