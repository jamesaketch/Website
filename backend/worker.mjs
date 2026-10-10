/* Deploy separately from GitHub Pages. Secrets never enter the browser bundle. */
const TYPES=new Set(['Portrait','Event','Editorial']);
function validEmail(value){return typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);}
function single(value,max){return typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\r\n\u0000-\u001f]/.test(value);}
function validDate(s){if(s==='')return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)return false;const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return s>=today;}
export function validate(data){return data&&typeof data==='object'&&TYPES.has(data.type)&&single(data.name,100)&&validEmail(data.email)&&typeof data.date==='string'&&validDate(data.date)&&typeof data.location==='string'&&data.location.length<=160&&!/[\r\n\u0000-\u001f]/.test(data.location)&&typeof data.brief==='string'&&data.brief.trim().length>=10&&data.brief.length<=3000&&!/\u0000/.test(data.brief)&&typeof data.requestId==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(data.requestId);}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');const allowed=(env.ALLOWED_ORIGINS||'https://aketch.ie,https://www.aketch.ie').split(',').map(s=>s.trim());
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(new URL(request.url).pathname!=='/api/booking')return reply(404,{ok:false});
  if(!origin||!allowed.includes(origin))return reply(403,{ok:false});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{ok:false});
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{ok:false});
  if(!env.RESEND_API_KEY||!env.BOOKING_FROM||!validEmail(env.BOOKING_TO)||!env.BOOKING_RATE_LIMITER)return reply(503,{ok:false});
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const {success}=await env.BOOKING_RATE_LIMITER.limit({key:ip});if(!success)return reply(429,{ok:false});
  if(Number(request.headers.get('Content-Length'))>12000)return reply(413,{ok:false});
  let body='';try{
   if(!request.body)return reply(400,{ok:false});
   const reader=request.body.getReader();let size=0;const decoder=new TextDecoder();
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>12000){await reader.cancel();return reply(413,{ok:false});}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();
  }catch{return reply(400,{ok:false});}
  let data;try{data=JSON.parse(body);}catch{return reply(400,{ok:false});}
  if(!validate(data)||typeof data.website!=='string'||data.website.trim())return reply(400,{ok:false});
  const text=[`Photography enquiry: ${data.type}`,`Name: ${data.name.trim()}`,`Reply to: ${data.email}`,`Preferred date: ${data.date||'Flexible'}`,`Location: ${data.location.trim()||'To be agreed'}`,'',data.brief.trim(),'','This is a booking request. No date has been reserved.'].join('\n');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`photo-${data.requestId}`},body:JSON.stringify({from:env.BOOKING_FROM,to:[env.BOOKING_TO],reply_to:data.email,subject:`Photography enquiry · ${data.type}`,text})});
   const result=await response.json().catch(()=>null);
   if(!response.ok||!result?.id)return reply(502,{ok:false});
   return reply(200,{ok:true});
  }catch{return reply(502,{ok:false});}finally{clearTimeout(timer);}
 }
};
