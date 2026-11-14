/* Seven Gestion — émission physique via agent Windows local. Aucune DLL dans le navigateur. */
(function(){
"use strict";
const BASE="http://127.0.0.1:38771",el=id=>document.getElementById(id);
const ctx=()=>window.SevenRfidContext?.(),is71=c=>!!c&&/(?:\b71\b|seventy[ -]?one)/i.test(c.hotelName||"");
let busy=false;
const msg=(text,error=false)=>{const status=el("sevenNativeStatus");if(status){status.textContent=text;status.dataset.result=error?"error":"pending";}const flash=el("flash");if(error&&flash)flash.textContent=text;};
async function request(action,payload){
 const token=await window.SevenRfidSessionToken?.();if(!token)throw Error("Reconnectez-vous à Seven Gestion.");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);
 try {
  const response=await fetch(BASE+action,{method:"POST",mode:"cors",cache:"no-store",
   headers:{"content-type":"application/json","x-seven-native":"1"},
   body:JSON.stringify({...payload,token}),signal:controller.signal});
  const data=await response.json();if(!response.ok||!data.ok)throw Error(data.message||data.error||"Opération refusée.");return data;
 }catch(err){
  if(err instanceof TypeError||err.name==="AbortError")throw Error("Le composant RFID Windows n'est pas accessible sur ce PC. Installez-le et relancez-le.");
  throw err;
 }finally{clearTimeout(timer);}
}
async function pair(){
 const c=ctx();if(!is71(c))return msg("Sélectionnez Seven 71.",true);
 if(!["supervisor","director","manager"].includes(c.role))return msg("Association réservée à la direction ou au gérant.",true);
 const b=el("sevenNativePair");b.disabled=true;
 try{const result=await request("/pair",{hotel_id:c.hotelId});msg(result.message||"Poste associé.");}catch(e){msg(e.message,true);}finally{b.disabled=false;}
}
async function issue(id){
 if(busy)return;
 const c=ctx();if(!is71(c))return msg("Sélectionnez Seven 71.",true);
 if(!["supervisor","director","manager","reception"].includes(c.role))return msg("Accès refusé.",true);
 const stay=c.stays.find(s=>s.id===id&&s.hotel_id===c.hotelId&&s.status==="checked_in");
 if(!stay)return msg("Sélectionnez un séjour avec arrivée enregistrée.",true);
 const room=c.rooms.find(r=>r.id===stay.room_id);if(!room)return msg("Chambre introuvable.",true);
 busy=true;const b=el("sevenNativeIssue");if(b)b.disabled=true;
 msg("Contrôle du séjour et du lecteur. Confirmez l'écriture sur ce PC...");
 try{
  const result=await request("/issue",{hotel_id:c.hotelId,reservation_id:stay.id});
  msg(result.message||(result.ok?"Écriture terminée.":"Écriture non confirmée."),!result.ok);
  if(result.status==="verified_by_reader")msg("Carte chambre "+room.number+" écrite et relue. Vérifiez l'ouverture physique de la serrure avant remise au client.");
 }catch(e){msg(e.message,true);}finally{busy=false;if(b)b.disabled=false;}
}
function refresh(){
 const selector=el("sevenNativeStay"),c=ctx();if(!selector)return;
 const old=selector.value;selector.replaceChildren();
 const option=document.createElement("option");option.value="";option.textContent="Choisir un séjour en cours";selector.appendChild(option);
 if(is71(c))c.stays.forEach(s=>{if(s.status!=="checked_in"||s.hotel_id!==c.hotelId)return;
  const room=c.rooms.find(r=>r.id===s.room_id);if(!room)return;
  const o=document.createElement("option");o.value=s.id;o.textContent="Chambre "+room.number+" · "+(s.reference||s.id.slice(0,8));selector.appendChild(o);
 });
 if(Array.from(selector.options).some(x=>x.value===old))selector.value=old;
 const b=el("sevenNativeIssue");if(b)b.disabled=!is71(c);
}
function init(){
 const form=el("rfidScanForm");if(!form||el("sevenNativeIssue"))return;
 const panel=document.createElement("section");panel.className="seven-native-rfid";
 const title=document.createElement("h3");title.textContent="Créer une carte CLIENT depuis Seven Gestion";panel.appendChild(title);
 const intro=document.createElement("p");intro.textContent="Le composant Windows programme le badge avec le lecteur USB, sans ouvrir Seven RFID Studio ni importer de fichier.";panel.appendChild(intro);
 const select=document.createElement("select");select.id="sevenNativeStay";select.setAttribute("aria-label","Séjour pour la carte");panel.appendChild(select);
 const row=document.createElement("div");row.className="seven-native-actions";
 const write=document.createElement("button");write.type="button";write.id="sevenNativeIssue";write.className="primary";write.textContent="Créer la carte CLIENT";write.onclick=()=>issue(select.value);row.appendChild(write);
 const link=document.createElement("button");link.type="button";link.id="sevenNativePair";link.className="outline";link.textContent="Associer le poste RFID";link.onclick=pair;row.appendChild(link);
 panel.appendChild(row);
 const status=document.createElement("p");status.id="sevenNativeStatus";status.className="seven-rfid-result";status.setAttribute("role","status");status.setAttribute("aria-live","polite");panel.appendChild(status);
 const note=document.createElement("p");note.textContent="Première utilisation : installer le composant Windows, associer l'hôtel, puis définir ses numéros internes de serrure. Les cartes doivent être vierges.";panel.appendChild(note);
 form.parentNode.insertBefore(panel,form);
 refresh();select.addEventListener("focus",refresh);window.addEventListener("seven:rfid-context",refresh);
 document.addEventListener("click",event=>{
  const btn=event.target.closest("[data-rfid-prepare]");if(!btn)return;
  event.preventDefault();event.stopPropagation();issue(btn.dataset.rfidPrepare);
 },true);
 fetch(BASE+"/health",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
  msg(data.paired?(data.configured?"Composant RFID prêt : posez une carte vierge.":"Associez la configuration du fabricant dans les paramètres Windows."):"Composant détecté. Cliquez sur « Associer le poste RFID ».");
 }).catch(()=>msg("Le composant Windows n'est pas connecté. Installez-le sur le PC de réception.",true));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();