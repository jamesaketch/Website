(function(){
'use strict';
const form=document.getElementById('booking-form');if(!form)return;
const edit=form.querySelector('[data-booking-edit]'),review=form.querySelector('[data-booking-review]'),summary=form.querySelector('.booking-summary'),status=form.querySelector('.booking-status'),send=form.querySelector('[data-send]'),back=form.querySelector('[data-edit]');
const date=form.elements.date;date.min=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Dublin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let reviewing=false,pending=false,requestId=null;
const fields=['type','name','email','date','location','brief','website'];
function payload(){const data=new FormData(form),out={};fields.forEach(k=>out[k]=String(data.get(k)||'').trim());return out;}
function showStatus(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function showReview(){const values=payload();summary.replaceChildren();[['Shoot',values.type],['Name',values.name],['Email',values.email],['Date',values.date||'Flexible'],['Location',values.location||'To be agreed'],['The idea',values.brief]].forEach(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;summary.append(dt,dd);});edit.hidden=true;review.hidden=false;reviewing=true;showStatus('');review.focus({preventScroll:true});review.scrollIntoView({block:'nearest',behavior:'auto'});}
back.addEventListener('click',()=>{if(pending)return;reviewing=false;review.hidden=true;edit.hidden=false;requestId=null;showStatus('');form.elements.name.focus({preventScroll:true});});
form.addEventListener('input',()=>{requestId=null;});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(pending)return;
 if(!reviewing){if(form.reportValidity())showReview();return;}
 pending=true;send.disabled=back.disabled=true;send.textContent='Sending…';showStatus('Sending your request…');
 requestId=requestId||(crypto.randomUUID?crypto.randomUUID():Date.now().toString(16)+'-'+Math.random().toString(16).slice(2));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(form.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload(),requestId}),signal:controller.signal});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data||data.ok!==true){throw Error(response.status===429?'Please wait a minute before trying again.':response.status===400?'Please check your details and try again.':'Your request could not be sent. Please try again or email James directly.');}
  form.hidden=true;const success=document.querySelector('.booking-success');success.hidden=false;success.focus();form.reset();
 }catch(error){showStatus(error.name==='AbortError'?'The connection timed out. Your details are still here; please try again.':error.message,true);}
 finally{clearTimeout(timer);pending=false;send.disabled=back.disabled=false;send.textContent='Send request';}
});
})();
