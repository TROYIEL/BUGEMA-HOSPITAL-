'use client';
import {useEffect,useRef,useState} from 'react';

/** A real, locally constructed 3D model. No external model download or tracking. */
export default function StethoscopeScene(){
 const host=useRef<HTMLDivElement>(null);const[ready,setReady]=useState(false);
 useEffect(()=>{
  let cancelled=false;let cleanup=()=>{};
  void import('three').then(THREE=>{
   const candidate=host.current;if(cancelled||!candidate)return;const element:HTMLDivElement=candidate;
   let renderer:InstanceType<typeof THREE.WebGLRenderer>;
   try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.domElement.setAttribute('aria-hidden','true');element.appendChild(renderer.domElement);
   const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,0,9);
   const model=new THREE.Group();scene.add(model);
   const rubber=new THREE.MeshStandardMaterial({color:0x082ae4,roughness:.43,metalness:.12});
   const steel=new THREE.MeshStandardMaterial({color:0xc5d2df,roughness:.23,metalness:.65});
   const dark=new THREE.MeshStandardMaterial({color:0x243347,roughness:.5,metalness:.08});
   const diaphragm=new THREE.MeshStandardMaterial({color:0xf2f5f8,roughness:.32,metalness:.28});
   const materials=[rubber,steel,dark,diaphragm];
   function tube(points:number[][],radius:number,material:InstanceType<typeof THREE.MeshStandardMaterial>){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,80,radius,12,false),material);model.add(mesh);return mesh;}
   // Binaural metal ear tubes, soft tips and the blue flexible Y-shaped tubing.
   tube([[-.6,2,.05],[-.95,1.82,.02],[-1.06,1.12,0],[-.91,.48,.05],[-.52,.02,.12],[0,-.35,.18]],.064,steel);
   tube([[.6,2,.05],[.95,1.82,.02],[1.06,1.12,0],[.91,.48,.05],[.52,.02,.12],[0,-.35,.18]],.064,steel);
   tube([[-.9,.46,.05],[-.57,.02,.12],[0,-.36,.18]],.104,rubber);
   tube([[.9,.46,.05],[.57,.02,.12],[0,-.36,.18]],.104,rubber);
   tube([[0,-.34,.18],[.02,-1.25,.15],[-.37,-1.93,.03],[-1.1,-2.09,-.06],[-1.58,-1.61,-.02],[-1.5,-.92,.08],[-.94,-.61,.23],[.15,-.95,.36],[1.22,-1.05,.42],[1.68,-.69,.51]],.115,rubber);
   for(const x of [-.57,.57]){const tip=new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),dark);tip.scale.set(1,.8,1);tip.position.set(x,2.02,.05);model.add(tip);}
   const head=new THREE.Group();head.position.set(1.72,-.57,.53);head.rotation.set(.32,-.25,-.15);model.add(head);
   function disc(radius:number,depth:number,z:number,material:InstanceType<typeof THREE.MeshStandardMaterial>){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,64),material);mesh.rotation.x=Math.PI/2;mesh.position.z=z;head.add(mesh);}
   disc(.52,.18,0,steel);disc(.46,.055,.115,dark);disc(.414,.025,.15,diaphragm);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.455,.023,12,64),steel);rim.position.z=.16;head.add(rim);
   const connector=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.33,24),steel);connector.position.set(0,-.52,0);head.add(connector);
   const smallHead=new THREE.Mesh(new THREE.CylinderGeometry(.26,.20,.16,32),steel);smallHead.rotation.x=Math.PI/2;smallHead.position.z=-.17;head.add(smallHead);
   scene.add(new THREE.HemisphereLight(0xffffff,0x8799b1,2.6));
   const key=new THREE.DirectionalLight(0xffffff,4.5);key.position.set(-3,5,6);scene.add(key);
   const edge=new THREE.DirectionalLight(0xb8ceff,3);edge.position.set(4,0,3);scene.add(edge);
   const fill=new THREE.DirectionalLight(0xffffff,2);fill.position.set(-4,-3,2);scene.add(fill);
   const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let frame=0;let progress=0;let target=0;let visible=true;
   function pose(){model.rotation.set(.12+progress*.38,-.36+progress*.95,-.12-progress*.24);model.position.set(-.12,progress*.28,0);model.scale.setScalar(1+progress*.08);}
   function draw(){frame=0;if(cancelled||!visible||document.hidden)return;progress=motion.matches?0:progress+(target-progress)*.13;pose();renderer.render(scene,camera);if(!motion.matches&&Math.abs(target-progress)>.001)frame=requestAnimationFrame(draw);}
   function requestDraw(){if(!frame&&!cancelled&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
   function scroll(){const hero=element.closest('.hospital-hero')||element;const rect=hero.getBoundingClientRect();target=motion.matches?0:Math.max(0,Math.min(1,-rect.top/Math.max(rect.height*.8,1)));requestDraw();}
   function resize(){const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=camera.aspect<.9?10:9;camera.updateProjectionMatrix();scroll();}
   const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(element);
   const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)scroll();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'50px'});visibility.observe(element);
   window.addEventListener('scroll',scroll,{passive:true});motion.addEventListener('change',scroll);document.addEventListener('visibilitychange',scroll);
   function contextLost(event:Event){event.preventDefault();visible=false;setReady(false);if(frame){cancelAnimationFrame(frame);frame=0;}}
   renderer.domElement.addEventListener('webglcontextlost',contextLost);
   resize();pose();renderer.render(scene,camera);setReady(true);
   cleanup=()=>{window.removeEventListener('scroll',scroll);motion.removeEventListener('change',scroll);document.removeEventListener('visibilitychange',scroll);sizeObserver.disconnect();visibility.disconnect();cancelAnimationFrame(frame);renderer.domElement.removeEventListener('webglcontextlost',contextLost);model.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{/* Keep the accessible static illustration if WebGL is unavailable. */});
  return()=>{cancelled=true;cleanup();};
 },[]);
 return <figure className="stethoscope-stage" role="img" aria-label="Three-dimensional blue and silver stethoscope. Its orientation changes as you scroll; a static view is shown when reduced motion is enabled.">
  <div className="stethoscope-orbit orbit-one" aria-hidden="true"/><div className="stethoscope-orbit orbit-two" aria-hidden="true"/>
  <span className="scene-cross scene-cross-one" aria-hidden="true">+</span><span className="scene-cross scene-cross-two" aria-hidden="true">+</span>
  <div ref={host} className="stethoscope-canvas" data-ready={ready}>
   <svg className="stethoscope-fallback" viewBox="0 0 500 520" fill="none" aria-hidden="true"><g transform="rotate(-12 250 260)"><path d="M185 72C120 70 119 190 190 239L246 269L302 239C373 190 372 70 307 72" stroke="#c0cbd8" strokeWidth="13" strokeLinecap="round"/><path d="M158 207Q176 239 246 269Q316 239 334 207M246 269C255 407 133 470 100 362C63 242 233 340 344 330" stroke="#082AE4" strokeWidth="22" strokeLinecap="round"/><path d="M158 203Q176 235 246 265Q316 235 334 203" stroke="#4764ee" strokeWidth="4" strokeLinecap="round"/><ellipse cx="183" cy="71" rx="15" ry="11" fill="#243347"/><ellipse cx="310" cy="71" rx="15" ry="11" fill="#243347"/><ellipse cx="359" cy="320" rx="48" ry="46" fill="#8e9dab"/><ellipse cx="359" cy="311" rx="48" ry="46" fill="#d0d9e3"/><ellipse cx="359" cy="311" rx="39" ry="37" fill="#f2f5f8" stroke="#64758b" strokeWidth="4"/></g></svg>
  </div>
  <div className="stethoscope-shadow" aria-hidden="true"/>
  <figcaption className="scene-scroll-hint"><span aria-hidden="true">↓</span> Scroll to explore</figcaption>
 </figure>;
}
