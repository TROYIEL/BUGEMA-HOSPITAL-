// Node 22+. Run: node --env-file=.env.local scripts/setup-appwrite.mjs
const endpoint=process.env.APPWRITE_ENDPOINT,project=process.env.APPWRITE_PROJECT_ID,key=process.env.APPWRITE_API_KEY,database=process.env.APPWRITE_DATABASE_ID;
if(!endpoint||!project||!key||!database)throw Error('Supply Appwrite server environment values');
export async function call(path,method='GET',body){const r=await fetch(endpoint+path,{method,headers:{'X-Appwrite-Project':project,'X-Appwrite-Key':key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const v=r.status===204?{}:await r.json();if(!r.ok){const e=Error(v.message);e.code=r.status;throw e;}return v;}
async function ensure(path,body){try{return await call(path,'POST',body);}catch(e){if(e.code!==409)throw e;}}
const publicKinds=['settings','pages','sections','departments','services','doctors','articles','categories','faqs','patient_information'];
await ensure('/databases',{databaseId:database,name:'Hospital CMS',enabled:true});
for(const kind of [...publicKinds,'appointments','enquiries','audit_logs','rate_limits']){
 const base=`/databases/${database}/collections/${kind}`;
 await ensure(`/databases/${database}/collections`,{collectionId:kind,name:kind,permissions:[],documentSecurity:true,enabled:true});
 for(const [name,size] of [['title',180],['slug',100],['status',30],['payload',60000]])await ensure(base+'/attributes/string',{key:name,size,required:true,array:false});
 await ensure(base+'/attributes/integer',{key:'order',required:true,min:0,max:10000,array:false});
 await ensure(base+'/attributes/boolean',{key:'featured',required:true,array:false});
 // Attributes provision asynchronously. Poll until ready before creating indexes.
 for(let i=0;i<60;i++){const attrs=await call(base+'/attributes');if(attrs.attributes.some(a=>a.status==='failed'))throw Error('Attribute creation failed: '+kind);if(attrs.attributes.length===6&&attrs.attributes.every(a=>a.status==='available'))break;if(i===59)throw Error('Attribute creation timed out: '+kind);await new Promise(r=>setTimeout(r,1000));}
 for(const [indexKey,type,attributes]of [['slug_unique','unique',['slug']],['status_order','key',['status','order']],['featured_status','key',['featured','status']],['order_index','key',['order']]])await ensure(base+'/indexes',{key:indexKey,type,attributes,orders:attributes.map(()=>'ASC')});
 console.log('Prepared collection:',kind);
}
for(const [id,name]of [[process.env.APPWRITE_PUBLIC_BUCKET_ID,'Public hospital media'],[process.env.APPWRITE_PRIVATE_BUCKET_ID,'Private hospital files']]){if(!id)throw Error('Both storage bucket IDs are required');await ensure('/storage/buckets',{bucketId:id,name,permissions:[],fileSecurity:true,enabled:true,maximumFileSize:5242880,allowedFileExtensions:['jpg','jpeg','png','webp','pdf'],compression:'none',encryption:true,antivirus:true});console.log('Prepared bucket:',name);}
console.log('Schema ready. All collections and buckets deny client writes. Only published documents/public uploads receive read("any").');
