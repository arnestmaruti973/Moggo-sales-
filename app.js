const $=s=>document.querySelector(s);
let publicData={};
const brandOptions={Motorbike:["Bajaj Boxer","TVS","Honda","Yamaha","Other"],Car:["Toyota","Nissan","Mazda","Subaru","Honda","Other"]};
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function card(v){return `<article class="vehicle-card"><img src="${esc(v.image_url||"https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900")}" alt="${esc(v.brand+" "+v.model)}" onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900'"><div class="vehicle-info"><small>${esc(v.type)} · ${esc(v.condition_type||"New")}</small><h3>${esc(v.brand)} ${esc(v.model)}</h3><p>${esc(v.description||"Ask our team about availability and pricing.")}</p><button type="button" data-type="${esc(v.type)}" data-brand="${esc(v.brand)}" data-model="${esc(v.model)}">Enquire about this vehicle ↗</button></div></article>`}
async function loadPublic(){
 try{const r=await fetch("/api/public");publicData=await r.json();const s=publicData.settings;
 $("#brandName").innerHTML=esc(s.company_name);$("#footerName").innerHTML=esc(s.company_name);$("#copyrightName").textContent=s.company_name;
 $("#aboutText").textContent=s.about;$("#contactPhone").textContent="Phone: "+(s.phone||"Contact us");$("#contactEmail").textContent="Email: "+(s.email||"Contact us");$("#contactAddress").textContent=s.address||"";$("#year").textContent=new Date().getFullYear();
 $("#bikeGrid").innerHTML=publicData.vehicles.filter(v=>v.type==="Motorbike").map(card).join("")||"<p>Vehicle listings coming soon.</p>";
 $("#carGrid").innerHTML=publicData.vehicles.filter(v=>v.type==="Car").map(card).join("")||"<p>Vehicle listings coming soon.</p>";
 }catch(e){console.error(e)}
}
function updateBrands(selected=""){const type=$("#vehicleType").value;$("#brandSelect").innerHTML='<option value="">Choose brand</option>'+(brandOptions[type]||[]).map(x=>`<option ${x===selected?"selected":""}>${x}</option>`).join("");}
$("#vehicleType").addEventListener("change",()=>updateBrands());
document.addEventListener("click",e=>{
 const pick=e.target.closest("[data-pick]");if(pick){e.preventDefault();$("#vehicleType").value=pick.dataset.pick;updateBrands();$("#apply").scrollIntoView({behavior:"smooth"});}
 const btn=e.target.closest(".vehicle-info button");if(btn){$("#vehicleType").value=btn.dataset.type;updateBrands(btn.dataset.brand);$("#applicationForm [name=model]").value=btn.dataset.model;$("#apply").scrollIntoView({behavior:"smooth"});}
});
$("#menuToggle").addEventListener("click",()=>$("#nav").classList.toggle("open"));
$("#nav").addEventListener("click",e=>{if(e.target.tagName==="A")$("#nav").classList.remove("open")});
$("#applicationForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,msg=$("#formMessage"),btn=$("#submitBtn");
 if(!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form).entries());
 if(!/^[0-9+()\-\s]{7,25}$/.test(data.phone)||!/^[0-9+()\-\s]{7,25}$/.test(data.whatsapp)){msg.textContent="Please enter valid phone and WhatsApp numbers.";return;}
 btn.disabled=true;btn.textContent="Submitting application…";msg.textContent="";
 try{
  const r=await fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const out=await r.json();if(!r.ok)throw new Error(out.error||"Could not submit application.");
  msg.textContent=`Application #${out.reference} saved. Opening WhatsApp…`;
  window.location.href=out.whatsappUrl;
 }catch(err){msg.textContent=err.message;btn.disabled=false;btn.innerHTML='Submit application & continue to WhatsApp <span>→</span>';}
});
loadPublic();
