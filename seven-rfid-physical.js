/* Seven Gestion > demande physique de carte CLIENT. Aucun accès USB depuis le navigateur. */
(function(){
 'use strict';
 function show(msg,kind){
  var el=document.getElementById('sevenPhysicalStatus');
  if(el){el.textContent=msg;el.dataset.result=kind||'pending';}
 }
 function prepare(){
  var ctx=typeof window.SevenRfidContext==='function'?window.SevenRfidContext():null;
  var select=document.getElementById('sevenPhysicalStay');
  if(!ctx||!select||!ctx.hotelId||!['supervisor','director','manager','reception'].includes(ctx.role)){
    show('Connexion et rôle réceptionniste requis.','error');return;
  }
  if(!navigator.onLine){show('Connexion Seven requise pour préparer la carte.','error');return;}
  var stay=ctx.stays.find(function(x){return x.id===select.value && x.hotel_id===ctx.hotelId && x.status==='checked_in';});
  var room=stay&&ctx.rooms.find(function(x){return x.id===stay.room_id;});
  if(!stay||!room){show('Sélectionnez un séjour actif dont la chambre est attribuée.','error');return;}
  if(!/\b71\b/.test(String(ctx.hotelName)) && !/seventy\s*one/i.test(String(ctx.hotelName))){
    show('Ce module matériel est pour Seven 71 seulement. Confirmez l’établissement sélectionné.','error');return;
  }
  var end=String(stay.check_out||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(end)){show('Date de fin de séjour invalide.','error');return;}
  var expiry=end+'T12:00:00';
  if(new Date(expiry).getTime()<=Date.now() || new Date(expiry).getTime()>Date.now()+30*864e5){
    show('Date de fin passée ou hors fenêtre de test (30 jours).','error');return;
  }
  var number=String(room.number||'');
  if(!/^[A-Za-z0-9-]{1,16}$/.test(number)){show('Numéro de chambre non pris en charge.','error');return;}
  var file=['SEVENRFID1','site=71','reservation='+stay.id,'room='+number,'expires='+expiry].join('\r\n')+'\r\n';
  var blob=new Blob([file],{type:'application/octet-stream'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='seven-71-'+number+'.sevenrfid';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  show('Demande prête pour la chambre '+number+'. Ouvrez ce fichier avec Seven RFID Studio 2.5 sur le PC du lecteur. Aucune carte n’a encore été programmée.','success');
 }
 function init(){
  var form=document.getElementById('rfidScanForm');
  if(!form || document.getElementById('sevenPhysicalPrepare'))return;
  var div=document.createElement('div');div.className='seven-rfid-physical';
  var h=document.createElement('h3');h.textContent='Émettre une carte CLIENT physique — Seven 71';div.appendChild(h);
  var p=document.createElement('p');p.textContent='Choisissez un séjour dont l’arrivée est validée. La programmation et la vérification se font sur le poste Windows avec Seven RFID Studio.';div.appendChild(p);
  var label=document.createElement('label');label.textContent='Séjour actif à encoder';label.className='seven-rfid-input-label';
  var select=document.createElement('select');select.id='sevenPhysicalStay';select.setAttribute('aria-label','Séjour actif pour émission physique');select.required=true;
  label.appendChild(select);div.appendChild(label);
  function refresh(){
    var ctx=typeof window.SevenRfidContext==='function'?window.SevenRfidContext():null;
    var previous=select.value;
    select.replaceChildren();
    var placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choisir une chambre occupée';select.appendChild(placeholder);
    if(ctx&&Array.isArray(ctx.stays))ctx.stays.forEach(function(stay){
      if(stay.hotel_id!==ctx.hotelId||stay.status!=='checked_in')return;
      var room=ctx.rooms.find(function(r){return r.id===stay.room_id;});if(!room)return;
      var opt=document.createElement('option');opt.value=stay.id;
      opt.textContent=String(room.number)+' · séjour '+String(stay.reference||stay.id.slice(0,8));
      select.appendChild(opt);
    });
    if(Array.from(select.options).some(function(x){return x.value===previous;}))select.value=previous;
  }
  select.addEventListener('focus',refresh);
  select.addEventListener('pointerdown',refresh);
  refresh();
  window.addEventListener('seven:rfid-context',refresh);
  var btn=document.createElement('button');btn.type='button';btn.className='primary';btn.id='sevenPhysicalPrepare';btn.textContent='Préparer la carte CLIENT';btn.addEventListener('click',prepare);div.appendChild(btn);
  var status=document.createElement('p');status.id='sevenPhysicalStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='seven-rfid-result';div.appendChild(status);
  form.parentNode.insertBefore(div,form.nextSibling);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();