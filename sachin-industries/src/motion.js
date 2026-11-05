import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
export function initMotion(enabled){
 let context;
 function setMotion(on){
  context?.revert();context=null;if(!on)return;
  context=gsap.context(()=>{
   if(window.scrollY<80){const intro=gsap.timeline({defaults:{ease:'power3.out'}});intro.from('.hero-location',{y:10,duration:.7}).from('.hero-line',{y:30,opacity:.75,duration:.85,stagger:.13},.1).from('.hero-services, .hero-description, .hero-actions',{y:12,duration:.8,stagger:.1},.5).from('.hero-bottom>div',{y:10,duration:.8,stagger:.1},.85);}
   gsap.utils.toArray('.reveal').forEach(el=>gsap.from(el,{y:35,opacity:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%',once:true}}));
   gsap.from('.service-card',{y:55,opacity:0,duration:1,stagger:.14,ease:'power3.out',scrollTrigger:{trigger:'.service-cards',start:'top 88%',once:true}});
   gsap.from('.scale-number',{scale:.87,opacity:.3,ease:'none',scrollTrigger:{trigger:'.scale-story',start:'top 90%',end:'center 45%',scrub:1}});
   gsap.from('.dimension-line',{scaleX:.2,transformOrigin:'center',ease:'none',scrollTrigger:{trigger:'.scale-story',start:'top 75%',end:'center 35%',scrub:1}});
   gsap.fromTo('.factory-image-wrap>img',{scale:1.04},{scale:1,ease:'none',scrollTrigger:{trigger:'.factory-image-wrap',start:'top bottom',end:'bottom top',scrub:1}});
  });
 }
 setMotion(enabled);return{setMotion};
}
