/* Small WebGL renderer: real GPU geometry, no third-party runtime. */
(function(){
'use strict';
const root=document.documentElement, motion=matchMedia('(prefers-reduced-motion: reduce)');
const still=()=>motion.matches||root.dataset.motion==='reduced';
function colour(css){const c=document.createElement('canvas').getContext('2d');c.fillStyle=css;const h=c.fillStyle;if(h.startsWith('#'))return[h.slice(1,3),h.slice(3,5),h.slice(5,7)].map(n=>parseInt(n,16)/255);const rgb=h.match(/[\d.]+/g);return rgb?rgb.slice(0,3).map(Number).map(n=>n/255):[.65,.4,.2];}
function palette(){const s=getComputedStyle(root);return {accent:colour(s.getPropertyValue('--accent').trim()),line:colour(s.getPropertyValue('--muted').trim()),tail:colour(s.getPropertyValue('--c-tails').trim())};}
function vertex(x,y,z,c){return [x,y,z,...c];}
function scene(canvas,{yaw=-.55,pitch=.48,scale=1.2,onLoss=()=>{}}={}){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});if(!gl)return null;
 const vertexSource='attribute vec3 aPosition;attribute vec3 aColor;uniform float uYaw,uPitch,uAspect,uScale;varying vec3 vColor;void main(){float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);vec3 p=vec3(cy*aPosition.x+sy*aPosition.z,aPosition.y,-sy*aPosition.x+cy*aPosition.z);p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);float f=3.8/(3.8+p.z);gl_Position=vec4(p.x*uScale*f/uAspect,p.y*uScale*f,p.z*.12,1.0);gl_PointSize=5.0;vColor=aColor;}';
 const fragmentSource='precision mediump float;varying vec3 vColor;uniform float uAlpha;void main(){gl_FragColor=vec4(vColor,uAlpha);}';
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader unavailable');return s;}
 let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('No program');}catch{return null;}
 const uniforms={};['Yaw','Pitch','Aspect','Scale','Alpha'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,'u'+n));
 const position=gl.getAttribLocation(program,'aPosition'),colourLoc=gl.getAttribLocation(program,'aColor');let meshes=[],lost=false,width=1,height=1,visible=true;
 const labels=[];
 const api={yaw,pitch,scale,visible:true,draw,clear(){meshes.forEach(m=>gl.deleteBuffer(m.buffer));meshes=[];},add(data,mode='LINES',alpha=1){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const mesh={buffer,count:data.length/6,mode:gl[mode],alpha};meshes.push(mesh);return mesh;},update(mesh,data){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);mesh.count=data.length/6;},label(text,p){const span=document.createElement('span');span.className='scene-label';span.textContent=text;canvas.parentElement.append(span);labels.push({span,p});},project,reset(){api.yaw=yaw;api.pitch=pitch;draw();}};
 function project(p){const cy=Math.cos(api.yaw),sy=Math.sin(api.yaw),cp=Math.cos(api.pitch),sp=Math.sin(api.pitch);let x=cy*p[0]+sy*p[2],z=-sy*p[0]+cy*p[2],y=cp*p[1]-sp*z;z=sp*p[1]+cp*z;let f=3.8/(3.8+z);return[(x*api.scale*Math.min(1,width/height)*f/(width/height)+1)*width/2,(1-y*api.scale*Math.min(1,width/height)*f)*height/2];}
 function draw(){if(lost||!visible)return;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(program);gl.uniform1f(uniforms.Yaw,api.yaw);gl.uniform1f(uniforms.Pitch,api.pitch);gl.uniform1f(uniforms.Aspect,width/height);gl.uniform1f(uniforms.Scale,api.scale*Math.min(1,width/height));meshes.forEach(m=>{gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(colourLoc);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(colourLoc,3,gl.FLOAT,false,24,12);gl.uniform1f(uniforms.Alpha,m.alpha);gl.drawArrays(m.mode,0,m.count);});labels.forEach(l=>{const p=project(l.p);l.span.style.left=Math.max(25,Math.min(width-25,p[0]))+'px';l.span.style.top=Math.max(12,Math.min(height-12,p[1]))+'px';});}
 function resize(){const r=canvas.getBoundingClientRect();if(!r.width)return;width=r.width;height=r.height;let d=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);draw();}
 new ResizeObserver(resize).observe(canvas);
 if('IntersectionObserver'in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;api.visible=visible;if(visible)draw();}).observe(canvas);
 let drag=null;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:api.yaw,pitch:api.pitch,type:e.pointerType};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;api.yaw=drag.yaw+(e.clientX-drag.x)*.009;if(drag.type==='mouse')api.pitch=Math.max(-.6,Math.min(1.15,drag.pitch+(e.clientY-drag.y)*.006));draw();});
 ['pointerup','pointercancel','lostpointercapture'].forEach(n=>canvas.addEventListener(n,()=>drag=null));
 canvas.addEventListener('keydown',e=>{let changed=true;if(e.key==='ArrowLeft')api.yaw-=.12;else if(e.key==='ArrowRight')api.yaw+=.12;else if(e.key==='ArrowUp')api.pitch=Math.max(-.6,api.pitch-.1);else if(e.key==='ArrowDown')api.pitch=Math.min(1.15,api.pitch+.1);else if(e.key==='Home')api.reset();else changed=false;if(changed){e.preventDefault();draw();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;onLoss();});resize();return api;
}
function lgamma(z){const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-lgamma(1-z);z--;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);let t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);}
function density(x,nu){return Math.exp(lgamma((nu+1)/2)-lgamma(nu/2)-.5*Math.log(nu*Math.PI)-(nu+1)/2*Math.log1p(x*x/nu));}
const box=document.querySelector('[data-viz=tdist]');
if(box){
 const plot=box.querySelector('svg'),key=box.querySelector('.vkey'),input=box.querySelector('input');
 const tools=document.createElement('div');tools.className='scene-tools';tools.innerHTML='<div class="segment" role="group" aria-label="Distribution view"><button type="button" aria-pressed="false">2D curve</button><button type="button" aria-pressed="true">3D surface</button></div><button type="button" class="chip">Reset view</button>';
 const wrap=document.createElement('div');wrap.className='scene';wrap.innerHTML='<canvas tabindex="0" role="img" aria-label="Student-t density surface. Horizontal axis: x, minus five to five scale units. Depth: degrees of freedom from one to one hundred on a logarithmic scale. Height: probability density. Drag sideways or use arrow keys to rotate; Home resets the view."></canvas>';
 const caption=document.createElement('p');caption.className='scene-caption';caption.textContent='Drag to rotate · x: −5 to 5 · ν: 1–100 (log scale) · height: density. The highlighted curve follows the slider.';
 plot.before(tools,wrap,caption);const buttons=tools.querySelectorAll('button');
 function twoD(){plot.style.display='';key.hidden=false;wrap.hidden=caption.hidden=true;buttons[0].setAttribute('aria-pressed','true');buttons[1].setAttribute('aria-pressed','false');buttons[2].hidden=true;}
 const renderer=scene(wrap.querySelector('canvas'),{scale:.66,onLoss:()=>{twoD();buttons[1].disabled=true;caption.textContent='3D is unavailable; the 2D chart remains interactive.';caption.hidden=false;}});
 if(renderer){
  const N=54,M=32,NU=[1,2,3,4,6,8,12,20,30,50,100];let colours=palette();
  function point(i,j){const x=-5+10*i/N,nu=Math.exp(Math.log(100)*j/M),d=density(x,nu);return[x*.255,d*3.3-.6,(j/M-.5)*1.8];}
  function build(){renderer.clear();const triangles=[],wire=[],axis=[],selected=[],c=colours.tail;
   function v(p){const blend=Math.min(1,(p[1]+.6)/1.4);return vertex(...p,c.map((a,i)=>a*(.55+.3*blend)+(.14*blend)));}
   for(let j=0;j<M;j++)for(let i=0;i<N;i++){let a=point(i,j),b=point(i+1,j),c1=point(i,j+1),d=point(i+1,j+1);triangles.push(...v(a),...v(b),...v(c1),...v(b),...v(d),...v(c1));}
   for(let j=0;j<=M;j+=4)for(let i=0;i<N;i++)wire.push(...vertex(...point(i,j),colours.line),...vertex(...point(i+1,j),colours.line));
   for(let i=0;i<=N;i+=6)for(let j=0;j<M;j++)wire.push(...vertex(...point(i,j),colours.line),...vertex(...point(i,j+1),colours.line));
   const ends=[[[-1.35,-.62,-.95],[1.4,-.62,-.95]],[[-1.35,-.62,-.95],[-1.35,-.62,1]],[[-1.35,-.62,-.95],[-1.35,.83,-.95]]];ends.forEach(pair=>pair.forEach(p=>axis.push(...vertex(...p,colours.line))));
   const nu=NU[+input.value],z=(Math.log(nu)/Math.log(100)-.5)*1.8;
   for(let i=0;i<=160;i++){let x=-5+10*i/160;selected.push(...vertex(x*.255,density(x,nu)*3.3-.585,z,colours.accent.map(c=>Math.min(1,c*1.35))));}
   renderer.add(triangles,'TRIANGLES',.87);renderer.add(wire,'LINES',.16);renderer.add(axis);renderer.add(selected,'LINE_STRIP');renderer.draw();
  }
  renderer.label('x →',[1.4,-.62,-.95]);renderer.label('ν →',[-1.35,-.62,1]);renderer.label('density ↑',[-1.35,.83,-.95]);renderer.label('−5',[-1.25,-.73,-.95]);renderer.label('5',[1.25,-.73,-.95]);renderer.label('1',[-1.5,-.6,-.9]);renderer.label('100',[-1.5,-.6,.9]);
  input.addEventListener('input',build);buttons[0].addEventListener('click',twoD);buttons[1].addEventListener('click',()=>{plot.style.display='none';key.hidden=true;wrap.hidden=caption.hidden=false;buttons[0].setAttribute('aria-pressed','false');buttons[1].setAttribute('aria-pressed','true');buttons[2].hidden=false;renderer.draw();});buttons[2].addEventListener('click',()=>renderer.reset());plot.style.display='none';key.hidden=true;build();
  new MutationObserver(()=>{colours=palette();build();}).observe(root,{attributes:true,attributeFilter:['data-theme','data-contrast','class']});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{colours=palette();build();});
 }else{twoD();buttons[1].disabled=true;buttons[1].title='3D graphics are unavailable on this device';}
}
const original=document.querySelector('.amc .orbit');
if(original){
 const holder=document.createElement('div');holder.className='orbital';holder.innerHTML='<div class="scene"><canvas tabindex="0" role="img" aria-label="Angular Momentum Capital orbital graphic. Drag or use the arrow keys to rotate. Home resets the view."></canvas></div><div class="orbit-stages" role="group" aria-label="Explore Angular Momentum Capital"><button type="button" class="chip" aria-pressed="true">Research</button><button type="button" class="chip" aria-pressed="false">Signals</button><button type="button" class="chip" aria-pressed="false">Risk</button></div><p class="orbit-description" aria-live="polite"></p><p class="scene-caption">Drag to rotate · arrow keys to explore</p>';
 original.after(holder);const renderer=scene(holder.querySelector('canvas'),{scale:.74,pitch:.35,yaw:.3,onLoss:()=>{holder.hidden=true;original.style.display='';}});
 if(!renderer){holder.remove();return;}original.style.display='none';let selected=0,colours=palette(),phase=0,frame=0,last=0;
 const descriptions=['Start with a question. Explore the evidence behind an investment idea.','Translate an idea into an explicit, testable trading rule.','Examine exposure, uncertainty and the ways a strategy can fail.'];
 const buttons=holder.querySelectorAll('.orbit-stages button'),description=holder.querySelector('.orbit-description');description.textContent=descriptions[0];
 function ring(t,k,r=1){const x=Math.cos(t)*r,y=Math.sin(t)*r;const a=k*Math.PI/3+.25;return[x,Math.cos(a)*y,Math.sin(a)*y];}
 let particles=[];
 function build(){renderer.clear();particles=[];
  for(let k=0;k<3;k++){
   const data=[],c=colours.accent,a=k*Math.PI/3+.25,N=100,S=8,radius=k===selected?.024:.012;
   function tube(t,q){const radial=ring(t,k),normal=[0,-Math.sin(a),Math.cos(a)],n=radial.map((v,i)=>v*Math.cos(q)+normal[i]*Math.sin(q));const position=radial.map((v,i)=>v+n[i]*radius);const light=Math.max(0,n[0]*.35+n[1]*.75+n[2]*.55);const shade=c.map(v=>Math.min(1,v*(.48+.6*light)+.27*Math.pow(light,8)));return vertex(...position,shade);}
   for(let i=0;i<N;i++)for(let j=0;j<S;j++){let t=i/N*Math.PI*2,u=(i+1)/N*Math.PI*2,q=j/S*Math.PI*2,r=(j+1)/S*Math.PI*2;data.push(...tube(t,q),...tube(u,q),...tube(t,r),...tube(u,q),...tube(u,r),...tube(t,r));}
   renderer.add(data,'TRIANGLES');particles.push(renderer.add(vertex(...ring(phase*(1-k*.19)+k*2.1,k),colours.accent),'POINTS'));
  }
  const core=[];for(let a=0;a<3;a++)for(let i=0;i<=60;i++)core.push(...vertex(...ring(i/60*Math.PI*2,a,.14),colours.accent));renderer.add(core,'LINE_STRIP');renderer.draw();
 }
 buttons.forEach((b,i)=>{const select=()=>{selected=i;buttons.forEach((x,j)=>x.setAttribute('aria-pressed',String(i===j)));description.textContent=descriptions[i];build();};b.addEventListener('click',select);b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')select();});b.addEventListener('focus',select);});
 function animate(t){frame=requestAnimationFrame(animate);if(still()||document.hidden||!renderer.visible){last=t;return;}if(t-last<32)return;phase+=(t-last)*.0002;last=t;particles.forEach((mesh,k)=>renderer.update(mesh,vertex(...ring(phase*(1-k*.19)+k*2.1,k),colours.accent)));renderer.draw();}build();frame=requestAnimationFrame(animate);
 window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));window.addEventListener('pageshow',e=>{if(e.persisted){last=performance.now();frame=requestAnimationFrame(animate);}});
 new MutationObserver(()=>{colours=palette();build();}).observe(root,{attributes:true,attributeFilter:['data-theme','data-contrast']});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{colours=palette();build();});
}
})();
