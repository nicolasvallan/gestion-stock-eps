
const SUPABASE_URL='https://pcfhbuzjxjhevcknghmg.supabase.co';
const SUPABASE_KEY='sb_publishable_hG9MSwg1J-jmdZg6S5XJ2Q_wGNJ1Shj';
const TECHNICAL_EMAIL='eps.applicationsnico@gmail.com';
const {createClient}=supabase;
const sb=createClient(SUPABASE_URL,SUPABASE_KEY);

const S=['En cours','En stock','En réparation','En prêt'];
const BASE=['En cours','En stock'];
const OPTIONAL=['En réparation','En prêt'];
const A0=['Badminton','Futsal','Gym','Step','Basket','Handball','Athlétisme','Natation',"Course d'orientation",'Boxe française','Ultimate','Rugby','Autres'];
const P0=['Placard salle de gym','Bureau EPS','Réserve','Local EPS','Placard du haut'];
const K='eps-v4-m',AK='eps-v4-a',BK='eps-v4-b';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let M=[],A=[],B=[],loading=false,lastLoad=0,pollTimer=null;
const expandedMaterials=new Set();
let uiActivityFilter='';
let uiSearch='';

function rowmeta(m,s){m.meta??={};m.meta[s]??={id:null,l:'',c:''};return m.meta[s]}
function total(m){return m.v.reduce((a,v)=>a+m.s.reduce((b,s)=>b+Number(v.x[s]?.q||0),0),0)}
function setSync(text,kind=''){let el=$('#syncState');el.textContent=text;el.className=kind}
function showErr(err){console.error(err);setSync('● Erreur de synchronisation','err');alert(err?.message||String(err))}
function noDialogOpen(){return !document.querySelector('dialog[open]')}

async function requireOk(promise){
  const {data,error}=await promise;
  if(error)throw error;
  return data;
}

async function loadRemote({silent=false}={}){
  if(loading)return;
  loading=true;
  if(!silent)setSync('● Synchronisation…','busy');
  try{
    const [acts,mats,vars,stats,qtys,buys]=await Promise.all([
      requireOk(sb.from('activities').select('*').order('name')),
      requireOk(sb.from('materials').select('*').order('name')),
      requireOk(sb.from('variants').select('*').order('id')),
      requireOk(sb.from('material_statuses').select('*').order('id')),
      requireOk(sb.from('quantities').select('*').order('id')),
      requireOk(sb.from('purchases').select('*').order('id'))
    ]);

    A=acts.map(x=>x.name);
    const actById=Object.fromEntries(acts.map(x=>[String(x.id),x.name]));
    const varById=Object.fromEntries(vars.map(x=>[String(x.id),x]));
    const matById=Object.fromEntries(mats.map(x=>[String(x.id),x]));

    M=mats.map(mm=>{
      const mv=vars.filter(v=>String(v.material_id)===String(mm.id)).map(v=>({
        id:String(v.id),n:v.name||'',d:v.comment||'',x:Object.fromEntries(S.map(s=>[s,{id:null,q:0}]))
      }));
      const ms=stats.filter(st=>String(st.material_id)===String(mm.id));
      const meta={};
      ms.forEach(st=>meta[st.status]={id:String(st.id),l:st.location||'',c:st.comment||''});
      const statusNames=ms.map(st=>st.status);
      const ordered=[...BASE.filter(s=>statusNames.includes(s)),...OPTIONAL.filter(s=>statusNames.includes(s))];
      const m={id:String(mm.id),n:mm.name,a:actById[String(mm.activity_id)]||'',d:mm.comment||'',v:mv,s:ordered,meta};
      mv.forEach(v=>ms.forEach(st=>{
        const q=qtys.find(q=>String(q.variant_id)===String(v.id)&&String(q.material_status_id)===String(st.id));
        v.x[st.status]={id:q?String(q.id):null,q:q?.quantity||0};
      }));
      return m;
    });

    B=buys.map(b=>{
      const m=matById[String(b.material_id)],v=varById[String(b.variant_id)];
      return {id:String(b.id),mid:m?String(m.id):'',vid:v?String(v.id):'',m:m?.name||'Matériel supprimé',v:v?.name||'',a:m?actById[String(m.activity_id)]||'':'',q:b.quantity,c:b.comment||'',d:[m?.comment,v?.comment].filter(Boolean).join(' | ')};
    });

    lastLoad=Date.now();
    renderLocal();
    $('#emptyRemote').hidden=!(M.length===0 && hasLocalData());
    setSync('● Synchronisé','ok');
  }catch(e){if(!silent)showErr(e);else setSync('● Synchronisation interrompue','err')}
  finally{loading=false}
}

function hasLocalData(){
  try{return !!JSON.parse(localStorage.getItem(K)||'null')?.length}catch{return false}
}

function fill(){
  let o=A.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');
  $('#mact').innerHTML=o;

  // L'état du filtre est conservé indépendamment du DOM.
  // Ainsi une synchronisation distante ne peut jamais ramener l'utilisateur
  // sur « Toutes les activités » pendant qu'il travaille sur une activité.
  let activityFilter=$('#filter');
  activityFilter.innerHTML='<option value="">Toutes les activités</option>'+o;
  if(uiActivityFilter && A.includes(uiActivityFilter)) activityFilter.value=uiActivityFilter;
  else if(!uiActivityFilter) activityFilter.value='';

  let p=[...new Set([...P0,...M.flatMap(m=>m.s.map(s=>rowmeta(m,s).l).filter(Boolean))])].sort((a,b)=>a.localeCompare(b,'fr'));
  $('#places').innerHTML=p.map(x=>`<option value="${esc(x)}">`).join('');
  let pf=$('#placeFilter');
  if(pf){let keep=pf.value;pf.innerHTML='<option value="">Choisir un lieu…</option>'+p.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(p.includes(keep))pf.value=keep}
}
function renderLocal(){
  const y=window.scrollY;
  fill();cards();buys();places();
  $('#count').textContent=B.reduce((a,b)=>a+Number(b.q),0);
  requestAnimationFrame(()=>window.scrollTo(0,y));
}
function cards(){
  let q=uiSearch.toLowerCase(),f=uiActivityFilter,L=M.filter(m=>(!f||m.a===f)&&(!q||`${m.n} ${m.a} ${m.d} ${m.v.map(v=>v.n+' '+v.d)}`.toLowerCase().includes(q)));
  $('#cards').innerHTML=L.map(m=>{
    let simple=m.v.length===1&&!m.v[0].n;
    let heads=m.v.map(v=>`<th><div class="vhead"><span>${simple?'Quantité':esc(v.n)}</span>${simple?'':`<button class="vmenu" data-vmenu="${m.id}|${v.id}" title="Actions de la variante">⋮</button>`}</div>${v.d?`<span class="vnote">${esc(v.d)}</span>`:''}</th>`).join('');
    let row=s=>{let meta=rowmeta(m,s),optional=OPTIONAL.includes(s),open=expandedMaterials.has(m.id);return `<tr class="${s==='En cours'?'':'detail'}" ${s==='En cours'||open?'':'hidden'} data-r="${m.id}"><td class="status">${s==='En cours'?`<button class="toggle" data-toggle="${m.id}">${open?'▼':'▶'}</button>`:''}<span>${s}</span>${optional?`<button class="removeStatus" data-rstatus="${m.id}|${s}" title="Retirer cette ligne">×</button>`:''}</td>${m.v.map(v=>`<td class="qty" data-cell="${m.id}|${v.id}|${s}">${v.x[s]?.q||0}</td>`).join('')}<td class="editableMeta" data-rowedit="${m.id}|${s}" title="Modifier le lieu">${esc(meta.l)}</td><td class="editableMeta" data-rowedit="${m.id}|${s}" title="Modifier le commentaire">${esc(meta.c)}</td></tr>`};
    return `<div class="material"><div class="mhead"><div><div class="mtitle"><h3>${esc(m.n)}</h3><span class="tag">${esc(m.a)}</span><span class="sub">Total ${total(m)}</span></div></div><div class="mactions"><div class="menuwrap"><button class="dots" data-menu="${m.id}" title="Actions">⋮</button><div class="popmenu" data-pop="${m.id}" hidden><button data-var="${m.id}">+ Ajouter une variante</button><button data-status="${m.id}">+ Ajouter un statut</button><button data-buy="${m.id}">+ Ajouter à acheter</button><button data-edit="${m.id}">Modifier le matériel</button><button class="menudanger" data-del="${m.id}">Supprimer le matériel</button></div></div></div></div><div class="wrap"><table><thead><tr><th class="status">Statuts</th>${heads}<th class="place">Lieu de stockage</th><th class="comment">Commentaires</th></tr></thead><tbody>${m.s.map(row).join('')}</tbody></table></div></div>`;
  }).join('');
}

async function ensureActivity(name){
  let row=(await requireOk(sb.from('activities').select('*').eq('name',name).maybeSingle()));
  if(row)return row;
  return (await requireOk(sb.from('activities').insert({name}).select().single()));
}

async function createMaterial(name,activity,comment){
  const act=await ensureActivity(activity);
  const mat=await requireOk(sb.from('materials').insert({name,activity_id:act.id,comment}).select().single());
  const vari=await requireOk(sb.from('variants').insert({material_id:mat.id,name:'',comment:''}).select().single());
  const stats=await requireOk(sb.from('material_statuses').insert(BASE.map(status=>({material_id:mat.id,status,location:'',comment:''}))).select());
  await requireOk(sb.from('quantities').insert(stats.map(st=>({variant_id:vari.id,material_status_id:st.id,quantity:0}))));
}
async function updateMaterial(id,name,activity,comment){
  const act=await ensureActivity(activity);
  await requireOk(sb.from('materials').update({name,activity_id:act.id,comment}).eq('id',id));
}
async function addVariant(mid,name,comment){
  const v=await requireOk(sb.from('variants').insert({material_id:mid,name,comment}).select().single());
  const m=M.find(x=>x.id===String(mid));
  const statusIds=m.s.map(s=>rowmeta(m,s).id).filter(Boolean);
  if(statusIds.length)await requireOk(sb.from('quantities').insert(statusIds.map(sid=>({variant_id:v.id,material_status_id:sid,quantity:0}))));
}
async function editVariant(id,name,comment){await requireOk(sb.from('variants').update({name,comment}).eq('id',id))}
async function addStatus(mid,status){
  const st=await requireOk(sb.from('material_statuses').insert({material_id:mid,status,location:'',comment:''}).select().single());
  const m=M.find(x=>x.id===String(mid));
  if(m.v.length)await requireOk(sb.from('quantities').insert(m.v.map(v=>({variant_id:v.id,material_status_id:st.id,quantity:0}))));
}
async function setQuantity(v,s,q){
  const m=M.find(mm=>mm.v.some(x=>x.id===String(v)));
  const st=rowmeta(m,s);
  const cell=m.v.find(x=>x.id===String(v)).x[s];
  if(cell?.id)await requireOk(sb.from('quantities').update({quantity:q,updated_at:new Date().toISOString()}).eq('id',cell.id));
  else await requireOk(sb.from('quantities').upsert({variant_id:v,material_status_id:st.id,quantity:q},{onConflict:'variant_id,material_status_id'}));
}
async function setRowMeta(mid,s,l,c){
  const m=M.find(x=>x.id===String(mid)),meta=rowmeta(m,s);
  await requireOk(sb.from('material_statuses').update({location:l,comment:c}).eq('id',meta.id));
}

$('#cards').onclick=async e=>{
  let d=e.target.dataset;
  try{
    if(d.menu){document.querySelectorAll('.popmenu').forEach(p=>{if(p.dataset.pop!==d.menu)p.hidden=true});let p=document.querySelector(`[data-pop="${d.menu}"]`);p.hidden=!p.hidden;return}
    if(d.status){let m=M.find(x=>x.id===d.status),avail=OPTIONAL.filter(s=>!m.s.includes(s));if(!avail.length){alert('Les statuts optionnels sont déjà ajoutés pour ce matériel.');return}$('#smid').value=m.id;$('#sname').innerHTML=avail.map(s=>`<option>${esc(s)}</option>`).join('');$('#statusDlg').showModal();return}
    if(d.rstatus){let [mi,s]=d.rstatus.split('|'),m=M.find(x=>x.id===mi),meta=rowmeta(m,s),hasData=m.v.some(v=>Number(v.x[s]?.q||0)>0)||meta.l||meta.c;if(confirm(hasData?`Retirer la ligne "${s}" ? Les données de ce statut seront supprimées.`:`Retirer la ligne "${s}" ?`)){await requireOk(sb.from('material_statuses').delete().eq('id',meta.id));await loadRemote()}return}
    if(d.vmenu){let [mi,vi]=d.vmenu.split('|'),m=M.find(x=>x.id===mi),v=m.v.find(x=>x.id===vi);let choice=prompt(`Variante "${v.n}"\n\nTapez M pour modifier ou S pour supprimer :`,'M');if(!choice)return;if(choice.trim().toUpperCase()==='S'){if(confirm(`Supprimer la variante "${v.n}" et toutes ses quantités ?`)){await requireOk(sb.from('variants').delete().eq('id',vi));await loadRemote()}return}if(choice.trim().toUpperCase()==='M'){$('#vmid').value=mi;$('#vid').value=vi;$('#vname').value=v.n;$('#vdetails').value=v.d;$('#varTitle').textContent='Modifier la variante';$('#varDlg').showModal()}return}
    if(d.toggle){let r=[...document.querySelectorAll(`[data-r="${d.toggle}"]`)].slice(1),open=r.every(x=>x.hidden);r.forEach(x=>x.hidden=!open);if(open)expandedMaterials.add(d.toggle);else expandedMaterials.delete(d.toggle);e.target.textContent=open?'▼':'▶';return}
    if(d.cell){let [mi,vi,s]=d.cell.split('|');return openCell(mi,vi,s)}
    if(d.rowedit){let [mi,s]=d.rowedit.split('|'),m=M.find(x=>x.id===mi),meta=rowmeta(m,s);$('#rmid').value=mi;$('#rstatus').value=s;$('#rowTitle').textContent=`${m.n} — ${s}`;fillLocationSelect(meta.l);$('#rcom').value=meta.c;return $('#rowDlg').showModal()}
    if(d.var){$('#vmid').value=d.var;$('#vid').value='';$('#vname').value='';$('#vdetails').value='';$('#varTitle').textContent='Ajouter une variante';return $('#varDlg').showModal()}
    if(d.buy)return openBuy(d.buy);
    if(d.edit)return openMat(M.find(x=>x.id===d.edit));
    if(d.del&&confirm('Supprimer ce matériel ?')){await requireOk(sb.from('materials').delete().eq('id',d.del));await loadRemote()}
  }catch(err){showErr(err)}
};

function fillLocationSelect(current=''){
  let locations=[...new Set([...P0,...M.flatMap(m=>m.s.map(s=>rowmeta(m,s).l).filter(Boolean))])].sort((a,b)=>a.localeCompare(b,'fr'));
  if(current&&!locations.includes(current))locations.unshift(current);
  $('#rloc').innerHTML='<option value="">— Aucun lieu —</option>'+locations.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')+'<option value="__other__">+ Autre lieu…</option>';
  $('#rloc').value=current||'';
}
$('#rloc').onchange=e=>{
  if(e.target.value==='__other__'){
    let n=prompt('Nom du nouveau lieu :','');
    if(n&&n.trim()){
      let v=n.trim();
      let opt=document.createElement('option');opt.value=v;opt.textContent=v;
      e.target.insertBefore(opt,e.target.lastElementChild);e.target.value=v;
    }else e.target.value='';
  }
};

function openCell(mi,vi,s){let m=M.find(x=>x.id===mi),v=m?.v.find(x=>x.id===vi);if(!m||!v)return;$('#cmid').value=mi;$('#cvid').value=vi;$('#cstatus').value=s;$('#cellTitle').textContent=`${m.n}${v.n?' — '+v.n:''} — ${s}`;$('#cqty').value=v.x[s]?.q||0;$('#cellDlg').showModal()}
function openMat(m){$('#mid').value=m?.id||'';$('#mname').value=m?.n||'';$('#mact').value=m?.a||A[0]||'';$('#mdetails').value=m?.d||'';$('#matDlg').showModal()}
$('#addMat').onclick=()=>openMat();

$('#matForm').onsubmit=async e=>{e.preventDefault();try{setSync('● Enregistrement…','busy');let i=$('#mid').value,n=$('#mname').value.trim(),a=$('#mact').value,d=$('#mdetails').value.trim();if(i)await updateMaterial(i,n,a,d);else await createMaterial(n,a,d);$('#matDlg').close();await loadRemote()}catch(err){showErr(err)}}
$('#rowForm').onsubmit=async e=>{e.preventDefault();try{await setRowMeta($('#rmid').value,$('#rstatus').value,$('#rloc').value.trim(),$('#rcom').value.trim());$('#rowDlg').close();await loadRemote()}catch(err){showErr(err)}}
$('#statusForm').onsubmit=async e=>{e.preventDefault();try{await addStatus($('#smid').value,$('#sname').value);$('#statusDlg').close();await loadRemote()}catch(err){showErr(err)}}
$('#varForm').onsubmit=async e=>{e.preventDefault();try{let vi=$('#vid').value,n=$('#vname').value.trim(),d=$('#vdetails').value.trim();if(vi)await editVariant(vi,n,d);else await addVariant($('#vmid').value,n,d);$('#varDlg').close();await loadRemote()}catch(err){showErr(err)}}
$('#cellForm').onsubmit=async e=>{e.preventDefault();try{await setQuantity($('#cvid').value,$('#cstatus').value,Math.max(0,Number($('#cqty').value)||0));$('#cellDlg').close();await loadRemote()}catch(err){showErr(err)}}

function openBuy(i){let m=M.find(x=>x.id===i);$('#bmid').value=i;$('#buyVars').innerHTML=`<p><b>${esc(m.n)}</b></p><div class="buygrid">${m.v.map(v=>`<span>${esc(v.n||'Quantité')}</span><input type="number" min="0" value="0" data-bv="${v.id}">`).join('')}</div>`;$('#bcom').value='';$('#buyDlg').showModal()}
$('#buyForm').onsubmit=async e=>{e.preventDefault();try{let m=M.find(x=>x.id===$('#bmid').value),rows=[];document.querySelectorAll('[data-bv]').forEach(i=>{let q=Number(i.value);if(q>0)rows.push({material_id:m.id,variant_id:i.dataset.bv,quantity:q,comment:$('#bcom').value.trim()})});if(rows.length)await requireOk(sb.from('purchases').insert(rows));$('#buyDlg').close();await loadRemote();view('buy')}catch(err){showErr(err)}}

function places(){
  let sel=$('#placeFilter'),list=$('#placeList'),sum=$('#placeSummary');if(!sel||!list||!sum)return;
  let loc=sel.value;if(!loc){sum.innerHTML='';list.innerHTML='<p>Choisis un lieu.</p>';return}
  let rows=[];M.forEach(m=>m.s.forEach(s=>{let meta=rowmeta(m,s);if(meta.l!==loc)return;m.v.forEach(v=>{let q=Number(v.x[s]?.q||0);if(q>0)rows.push({m:m.n,v:v.n,a:m.a,s,q,c:meta.c})})}));
  rows.sort((a,b)=>a.m.localeCompare(b.m,'fr')||a.v.localeCompare(b.v,'fr')||a.s.localeCompare(b.s,'fr'));
  let qty=rows.reduce((n,r)=>n+r.q,0),materials=new Set(rows.map(r=>r.m)).size;
  sum.innerHTML=`<b>${esc(loc)}</b> — ${qty} objet${qty>1?'s':''} — ${materials} matériel${materials>1?'s':''} différent${materials>1?'s':''}`;
  list.innerHTML=rows.length?`<div class="placetable"><table><thead><tr><th>Matériel</th><th>Variante</th><th>Activité</th><th>Statut</th><th>Quantité</th><th>Commentaires</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.m)}</b></td><td>${esc(r.v||'—')}</td><td>${esc(r.a)}</td><td>${esc(r.s)}</td><td><b>${r.q}</b></td><td>${esc(r.c)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Aucun matériel enregistré dans ce lieu.</p>';
}
function buys(){$('#buyList').innerHTML=B.length?B.map(b=>`<div class="buyrow"><div><b>${esc(b.m)}${b.v?' — '+esc(b.v):''} : ${b.q}</b><div class="meta">${esc(b.a)}${b.d?' · '+esc(b.d):''}${b.c?' · '+esc(b.c):''}</div></div><button class="danger" data-bdel="${b.id}">Retirer</button></div>`).join(''):'<p>Aucun matériel à acheter.</p>'}
$('#buyList').onclick=async e=>{if(e.target.dataset.bdel){try{await requireOk(sb.from('purchases').delete().eq('id',e.target.dataset.bdel));await loadRemote()}catch(err){showErr(err)}}}

$('#addAct').onclick=()=>{$('#aname').value='';$('#actDlg').showModal()};
$('#actForm').onsubmit=async e=>{e.preventDefault();try{let a=$('#aname').value.trim();if(a)await requireOk(sb.from('activities').upsert({name:a},{onConflict:'name'}));$('#actDlg').close();await loadRemote()}catch(err){showErr(err)}}
document.querySelectorAll('.cancel').forEach(b=>b.onclick=()=>b.closest('dialog').close());

function view(x){document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==x);document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===x))}
document.querySelector('nav').onclick=e=>{let t=e.target.closest('.tab');if(t){view(t.dataset.view);if(t.dataset.view==='placeView')places()}};
$('#search').oninput=e=>{uiSearch=e.target.value;cards()};
$('#filter').onchange=e=>{uiActivityFilter=e.target.value;cards()};
$('#placeFilter').onchange=places;

function cv(x){return `"${String(x??'').replaceAll('"','""')}"`}
function dl(n,r){let u=URL.createObjectURL(new Blob(['\ufeff'+r.map(x=>x.map(cv).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=n;a.click();URL.revokeObjectURL(u)}
document.querySelector('.exports').onclick=e=>{if(!e.target.classList.contains('ex'))return;let f=e.target.dataset.s,r=[['Matériel','Variante','Activité','Statut','Quantité','Lieu','Commentaire matériel','Commentaire statut']];M.forEach(m=>m.v.forEach(v=>m.s.filter(s=>!f||s===f).forEach(s=>{let q=v.x[s]?.q||0,meta=rowmeta(m,s);if(q>0)r.push([m.n,v.n,m.a,s,q,meta.l,[m.d,v.d].filter(Boolean).join(' | '),meta.c])})));dl(f?`materiel-${f.toLowerCase().replace(' ','-')}.csv`:'inventaire-complet.csv',r)};
$('#exportBuy').onclick=()=>dl('liste-a-acheter.csv',[['Matériel','Variante','Activité','Quantité','Commentaire'],...B.map(b=>[b.m,b.v,b.a,b.q,b.c])]);

document.addEventListener('click',e=>{if(!e.target.closest('.menuwrap'))document.querySelectorAll('.popmenu').forEach(p=>p.hidden=true)});

async function importLocal(){
  let lm,la,lb;
  try{lm=JSON.parse(localStorage.getItem(K)||'[]');la=JSON.parse(localStorage.getItem(AK)||'[]');lb=JSON.parse(localStorage.getItem(BK)||'[]')}catch(e){throw new Error('Impossible de lire les données locales.')}
  if(!lm.length)throw new Error('Aucune donnée locale à importer.');
  setSync('● Import en cours…','busy');
  const activityMap={};
  for(const name of [...new Set([...(la||[]),...lm.map(m=>m.a)].filter(Boolean))]){
    const a=await ensureActivity(name);activityMap[name]=a.id;
  }
  const oldToNewMat={},oldToNewVar={};
  for(const m of lm){
    const mat=await requireOk(sb.from('materials').insert({name:m.n,activity_id:activityMap[m.a]||null,comment:m.d||''}).select().single());
    oldToNewMat[m.id]=mat.id;
    const variants=(m.v||[]).length?m.v:[{id:'',n:'',d:'',x:{}}];
    const newVars=await requireOk(sb.from('variants').insert(variants.map(v=>({material_id:mat.id,name:v.n||'',comment:v.d||''}))).select());
    variants.forEach((v,i)=>oldToNewVar[v.id]=newVars[i].id);
    const statuses=Array.isArray(m.s)&&m.s.length?m.s:BASE;
    const newStats=await requireOk(sb.from('material_statuses').insert(statuses.map(s=>({material_id:mat.id,status:s,location:(m.meta?.[s]?.l)||variants.map(v=>v.x?.[s]?.l).find(Boolean)||'',comment:(m.meta?.[s]?.c)||variants.map(v=>v.x?.[s]?.c).find(Boolean)||''}))).select());
    const qtyRows=[];
    variants.forEach((v,i)=>newStats.forEach(st=>qtyRows.push({variant_id:newVars[i].id,material_status_id:st.id,quantity:Number(v.x?.[st.status]?.q||0)})));
    if(qtyRows.length)await requireOk(sb.from('quantities').insert(qtyRows));
  }
  const purchaseRows=[];
  (lb||[]).forEach(b=>{
    const mid=oldToNewMat[b.mid],oldMat=lm.find(m=>m.id===b.mid);
    if(!mid||!oldMat)return;
    let oldVar=oldMat.v.find(v=>v.n===b.v) || oldMat.v[0];
    const vid=oldVar?oldToNewVar[oldVar.id]:null;
    if(vid)purchaseRows.push({material_id:mid,variant_id:vid,quantity:Number(b.q)||1,comment:b.c||''});
  });
  if(purchaseRows.length)await requireOk(sb.from('purchases').insert(purchaseRows));
  await loadRemote();
  $('#emptyRemote').hidden=true;
}
$('#importLocal').onclick=async()=>{if(confirm('Importer maintenant les données de la V4.7 dans la base partagée ?')){try{await importLocal()}catch(err){showErr(err)}}}

$('#refreshNow').onclick=()=>loadRemote();
$('#logout').onclick=async()=>{await sb.auth.signOut()};

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  $('#authMsg').textContent='Connexion…';
  const {error}=await sb.auth.signInWithPassword({
    email:TECHNICAL_EMAIL,
    password:$('#loginPassword').value
  });
  if(error){
    $('#authMsg').textContent='Mot de passe incorrect.';
    $('#loginPassword').select();
  }else{
    $('#authMsg').textContent='';
    $('#loginPassword').value='';
  }
}

async function applySession(session){
  if(session){
    $('#authScreen').hidden=true;$('#appMain').hidden=false;$('#userEmail').textContent='';
    await loadRemote();
    if(pollTimer)clearInterval(pollTimer);
    pollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&noDialogOpen())loadRemote({silent:true})},4000);
  }else{
    $('#authScreen').hidden=false;$('#appMain').hidden=true;$('#userEmail').textContent='';setSync('● Hors ligne','');
    if(pollTimer){clearInterval(pollTimer);pollTimer=null}
  }
}
sb.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>applySession(session),0)});
(async()=>{const {data}=await sb.auth.getSession();await applySession(data.session)})();
