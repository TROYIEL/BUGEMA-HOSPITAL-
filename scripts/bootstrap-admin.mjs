// Run separately with a temporary users.write key. No passwords are printed.
const {APPWRITE_ENDPOINT:endpoint,APPWRITE_PROJECT_ID:project,APPWRITE_API_KEY:key,INITIAL_ADMIN_EMAIL:email,INITIAL_ADMIN_PASSWORD:password}=process.env;
if(!email||!password||password.length<12)throw Error('Set initial admin email and a password of at least 12 characters');
async function call(path,method,body){const r=await fetch(endpoint+path,{method,headers:{'Content-Type':'application/json','X-Appwrite-Project':project,'X-Appwrite-Key':key},body:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.message);return v;}
const user=await call('/users','POST',{userId:crypto.randomUUID(),email,password,name:process.env.INITIAL_ADMIN_NAME||'Hospital administrator'});await call(`/users/${user.$id}/labels`,'PUT',{labels:['hospital-admin']});console.log('Administrator created. Remove INITIAL_ADMIN_PASSWORD from the environment and revoke the provisioning key.');
