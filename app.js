(()=>{
const D=window.DMP_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],K='raj_dmp_state_v3';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,month=d=>iso(d).slice(0,7);
const seed=()=>({settings:{...D.defaultSettings,sheetUrl:'',syncKey:''},templates:D.templates,plans:{},festivals:[],birthdays:[],remindersSeen:{}});
let S;try{S=JSON.parse(localStorage.getItem(K))||seed()}catch{S=seed()}
S.settings={...D.defaultSettings,...(S.settings||{})};S.templates=D.templates;S.plans??={};S.festivals??=[];S.birthdays??=[];S.remindersSeen??={};
const save=()=>localStorage.setItem(K,JSON.stringify(S));
const toast=x=>{let e=$('#toast');e.textContent=x;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)};
const meta={calendar:['Marketing Calendar','Daily work plan — every working day should have a message'],studio:['Message Studio','Select, edit and copy the approved message template'],festivals:['Festival Calendar','Plan festival wishes and reminders'],birthdays:['Birthday Calendar','Customer and staff birthday reminders'],settings:['Settings & Backup','Company details, Google Sheets live sync and backup']};

function setSyncState(mode,text){const b=$('#syncBadge'),c=$('#connectionState');if(b){b.className=`sync-badge ${mode}`;b.textContent=text}if(c){c.textContent=text;c.className=`badge sync-${mode}`}}
function hasLive(){return !!(S.settings.sheetUrl&&S.settings.syncKey)}
async function api(action,data){
  if(!hasLive()) throw new Error('Google Sheets live sync is not configured');
  const base=S.settings.sheetUrl.trim();
  let res;
  if(action==='ping'||action==='all'){
    const u=new URL(base);u.searchParams.set('action',action);u.searchParams.set('key',S.settings.syncKey);u.searchParams.set('_',Date.now());
    res=await fetch(u.toString(),{cache:'no-store'});
  }else{
    res=await fetch(base,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,key:S.settings.syncKey,data})});
  }
  const txt=await res.text();let out;try{out=JSON.parse(txt)}catch{throw new Error('Invalid response from Apps Script')}
  if(!out.ok) throw new Error(out.error||'Google Sheets request failed');
  return out;
}
function localChanged(){save();if(hasLive())setSyncState('pending','Sync pending');else setSyncState('local','Local Mode')}
async function remote(action,data,msg){
  if(!hasLive()){localChanged();return false}
  setSyncState('busy','Syncing…');
  try{await api(action,data);save();setSyncState('live','Live Connected');if(msg)toast(msg);return true}catch(e){save();setSyncState('pending','Saved locally');toast(`Local save only: ${e.message}`);return false}
}
function applyRemote(x){
  if(Array.isArray(x.marketing)){
    const plans={};x.marketing.forEach(r=>{const date=String(r.Date||'').slice(0,10);if(!date)return;const id=r.Template_ID||D.templates[0].id,t=D.templates.find(z=>z.id===id)||D.templates[0];plans[date]={templateId:t.id,templateName:t.name,custom:r.Work_or_Template||'',notes:r.Notes||'',status:r.Status||'Planned'}});S.plans=plans;
  }
  if(Array.isArray(x.festivals))S.festivals=x.festivals.filter(r=>r.Festival_Name&&r.Date).map(r=>({id:String(r.ID||('F'+Math.random())),name:r.Festival_Name,date:String(r.Date).slice(0,10),audience:r.Audience||'Customers + Staff',reminder:String(r.Reminder||'Yes').toLowerCase()!=='no'}));
  if(Array.isArray(x.birthdays))S.birthdays=x.birthdays.filter(r=>r.Name&&r.Birthday).map(r=>({id:String(r.ID||('B'+Math.random())),name:r.Name,date:String(r.Birthday).slice(0,10),type:r.Type||'Customer',notes:r.Notes||''}));
  if(x.settings){S.settings.companyName=x.settings.companyName||S.settings.companyName;S.settings.customerCare=x.settings.customerCare||S.settings.customerCare;S.settings.productRangeLink=x.settings.productRangeLink||S.settings.productRangeLink}
  save();renderCal();renderFest();renderBirth();opts($('#templateSelect'));opts($('#dayTemplate'));settings();
}
async function pullLive(showToast=true){if(!hasLive()){toast('Enter Apps Script URL and Sync Key first');return false}setSyncState('busy','Loading…');try{const r=await api('all');applyRemote(r.data||{});setSyncState('live','Live Connected');if(showToast)toast('Latest Google Sheet data loaded');return true}catch(e){setSyncState('pending','Connection issue');if(showToast)toast(e.message);return false}}
async function pushAll(){if(!hasLive())return toast('Connect Google Sheets first');setSyncState('busy','Uploading…');try{await api('replaceAll',{marketing:allPlanRows(),festivals:festRows(true),birthdays:birthRows(true),settings:{companyName:S.settings.companyName,customerCare:S.settings.customerCare,productRangeLink:S.settings.productRangeLink}});setSyncState('live','Live Connected');toast('Current data pushed to Google Sheets')}catch(e){setSyncState('pending','Upload failed');toast(e.message)}}

function go(p){$$('.page').forEach(x=>x.classList.toggle('active',x.id===p));$$('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$('#pageTitle').textContent=meta[p][0];$('#pageSubtitle').textContent=meta[p][1];if(p==='calendar')renderCal();if(p==='studio')studio();if(p==='festivals')renderFest();if(p==='birthdays')renderBirth();if(p==='settings')settings()}
$$('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));

function opts(el){if(el)el.innerHTML=S.templates.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} — ${esc(t.language)}</option>`).join('')}
opts($('#templateSelect'));opts($('#dayTemplate'));
function body(t){return t.body.replaceAll('[Company Name]',S.settings.companyName||'Raj Agencies').replaceAll('[Mobile Number]',S.settings.customerCare||'[Mobile Number]').replaceAll('[Product Range Link]',S.settings.productRangeLink||'[Product Range Link]')}
function studio(){if(!$('#messageBody').value)reset()}
function reset(){let t=S.templates.find(x=>x.id===$('#templateSelect').value)||S.templates[0];$('#messageBody').value=body(t);preview()}
function preview(){$('#messagePreview').textContent=$('#messageBody').value}
$('#templateSelect').onchange=reset;$('#resetTemplate').onclick=reset;$('#messageBody').oninput=preview;$('#copyMessage').onclick=async()=>{try{await navigator.clipboard.writeText($('#messageBody').value);toast('Message copied')}catch{toast('Please copy manually')}};

let editDay=null;
function renderCal(){let m=$('#calendarMonth').value||month(new Date());$('#calendarMonth').value=m;let[y,mo]=m.split('-').map(Number),first=new Date(y,mo-1,1),days=new Date(y,mo,0).getDate(),off=(first.getDay()+6)%7,h='';for(let i=0;i<off;i++)h+='<div class="day blank"></div>';for(let d=1;d<=days;d++){let dt=new Date(y,mo-1,d),k=iso(dt),sun=dt.getDay()===0,p=S.plans[k];h+=`<div class="day ${sun?'off':''}" data-date="${k}"><div class="day-num">${d}</div>${sun?'<div class="holiday">HOLIDAY</div>':p?`<div class="day-plan ${String(p.status||'planned').toLowerCase()}"><strong>${esc(p.custom||p.templateName)}</strong><br>${esc(p.status||'Planned')}${p.notes?` · ${esc(p.notes)}`:''}</div>`:'<div class="day-plan empty-plan">Plan required</div>'}</div>`}$('#calendarGrid').innerHTML=h;$$('#calendarGrid .day[data-date]').forEach(e=>e.onclick=()=>openDay(e.dataset.date))}
function openDay(k){let d=new Date(k+'T00:00:00');if(d.getDay()===0){toast('Sunday is Holiday');return}editDay=k;let p=S.plans[k];$('#dayTitle').textContent=`Plan ${k}`;$('#dayTemplate').value=p?.templateId||S.templates[0].id;$('#dayCustom').value=p?.custom||'';$('#dayNotes').value=p?.notes||'';$('#dayStatus').value=p?.status||'Planned';$('#dayModal').classList.remove('hidden')}
$('#closeDayModal').onclick=()=>$('#dayModal').classList.add('hidden');
$('#saveDayPlan').onclick=async()=>{let t=S.templates.find(x=>x.id===$('#dayTemplate').value),p={templateId:t.id,templateName:t.name,custom:$('#dayCustom').value.trim(),notes:$('#dayNotes').value.trim(),status:$('#dayStatus').value};S.plans[editDay]=p;localChanged();$('#dayModal').classList.add('hidden');renderCal();await remote('savePlan',{Date:editDay,Work_or_Template:p.custom||p.templateName,Template_ID:p.templateId,Notes:p.notes,Status:p.status},'Plan saved live')};
$('#autoPlan').onclick=async()=>{let[y,mo]=$('#calendarMonth').value.split('-').map(Number),days=new Date(y,mo,0).getDate(),seq=['brand-awareness','product-marketing','full-product-range','product-utility'],n=0,changed=[];for(let d=1;d<=days;d++){let dt=new Date(y,mo-1,d);if(dt.getDay()===0)continue;let k=iso(dt);if(S.plans[k])continue;let id=seq[n++%seq.length],t=S.templates.find(x=>x.id===id);S.plans[k]={templateId:id,templateName:t?.name||id,custom:'',notes:'Suggested regular communication',status:'Planned'};changed.push(k)}localChanged();renderCal();if(hasLive())await remote('bulkSavePlans',changed.map(k=>planRow(k,S.plans[k])),'Suggested month saved live');else toast('Suggested month created')};
function shift(n){let[y,m]=$('#calendarMonth').value.split('-').map(Number),d=new Date(y,m-1+n,1);$('#calendarMonth').value=month(d);renderCal()}
$('#prevMonth').onclick=()=>shift(-1);$('#nextMonth').onclick=()=>shift(1);$('#calendarMonth').onchange=renderCal;

function planRow(date,p){return{Date:date,Work_or_Template:p.custom||p.templateName,Template_ID:p.templateId,Notes:p.notes||'',Status:p.status||'Planned'}}
function rowsPlan(){let m=$('#calendarMonth').value;return Object.entries(S.plans).filter(([d])=>d.startsWith(m)).sort().map(([date,p])=>planRow(date,p))}
function allPlanRows(){return Object.entries(S.plans).sort().map(([date,p])=>planRow(date,p))}
function demoPlan(){let m=$('#calendarMonth').value,[y,mo]=m.split('-').map(Number),days=new Date(y,mo,0).getDate(),r=[];for(let d=1;d<=days;d++){let dt=new Date(y,mo-1,d);r.push({Date:iso(dt),Work_or_Template:dt.getDay()===0?'HOLIDAY':'New Product / Brand Awareness / Product Range',Template_ID:dt.getDay()===0?'':S.templates[0].id,Notes:'',Status:dt.getDay()===0?'Holiday':'Planned'})}return r}
function exportX(name,rows){if(window.XLSX){let ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data');XLSX.writeFile(wb,name)}else csv(name.replace('.xlsx','.csv'),rows)}
function csv(name,rows){let c=Object.keys(rows[0]||{}),q=v=>`"${String(v??'').replaceAll('"','""')}"`,txt=[c.join(','),...rows.map(r=>c.map(k=>q(r[k])).join(','))].join('\n');download(name,txt,'text/csv')}
function download(n,t,type){let b=new Blob([t],{type}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click();URL.revokeObjectURL(a.href)}
function readSheet(file,cb){let r=new FileReader();r.onload=()=>{try{if(file.name.toLowerCase().endsWith('.csv')){let lines=r.result.split(/\r?\n/).filter(Boolean),heads=lines.shift().split(',').map(x=>x.replace(/^"|"$/g,''));cb(lines.map(l=>{let a=l.split(',').map(x=>x.replace(/^"|"$/g,'').replaceAll('""','"'));return Object.fromEntries(heads.map((h,i)=>[h,a[i]||'']))}))}else{let wb=XLSX.read(r.result,{type:'array'});cb(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}))}}catch(e){toast('Import failed')}};file.name.toLowerCase().endsWith('.csv')?r.readAsText(file):r.readAsArrayBuffer(file)}
$('#downloadPlanDemo').onclick=()=>exportX('Marketing-Calendar-Demo.xlsx',demoPlan());$('#exportPlan').onclick=()=>exportX('Marketing-Calendar.xlsx',rowsPlan());
$('#planImport').onchange=e=>{let f=e.target.files[0];if(!f)return;readSheet(f,async rows=>{let changed=[];rows.forEach(x=>{let date=String(x.Date||x.date||'').slice(0,10);if(!date||String(x.Status).toLowerCase()==='holiday')return;let id=x.Template_ID||x.templateId||S.templates[0].id,t=S.templates.find(z=>z.id===id)||S.templates[0];S.plans[date]={templateId:t.id,templateName:t.name,custom:x.Work_or_Template||'',notes:x.Notes||'',status:x.Status||'Planned'};changed.push(planRow(date,S.plans[date]))});localChanged();renderCal();if(hasLive())await remote('bulkSavePlans',changed,'Calendar imported and synced');else toast(`${changed.length} calendar rows imported`)})};

function renderFest(){let a=[...S.festivals].sort((x,y)=>x.date.localeCompare(y.date));$('#festivalList').innerHTML=a.length?a.map(f=>`<div class="festival-item"><div><strong>${esc(f.name)}</strong><span class="muted small">${esc(f.audience)} · Reminder ${f.reminder?'ON':'OFF'}</span></div><div><strong>${esc(f.date)}</strong> <button class="icon-btn" data-fmsg="${f.id}">Message</button> <button class="icon-btn" data-fdel="${f.id}">Delete</button></div></div>`).join(''):'<div class="empty">No festivals saved.</div>';$$('[data-fdel]').forEach(b=>b.onclick=async()=>{let id=b.dataset.fdel;S.festivals=S.festivals.filter(x=>x.id!==id);localChanged();renderFest();await remote('deleteFestival',{ID:id},'Festival deleted')});$$('[data-fmsg]').forEach(b=>b.onclick=()=>{let f=S.festivals.find(x=>x.id===b.dataset.fmsg);go('studio');$('#templateSelect').value='festival';reset();$('#messageBody').value=$('#messageBody').value.replaceAll('{{Festival Name}}',f.name);preview()})}
$('#saveFestival').onclick=async()=>{if(!$('#festivalName').value||!$('#festivalDate').value)return toast('Name and date required');let f={id:'F'+Date.now(),name:$('#festivalName').value,date:$('#festivalDate').value,audience:$('#festivalAudience').value,reminder:$('#festivalReminder').checked};S.festivals.push(f);localChanged();renderFest();await remote('saveFestival',festivalRow(f),'Festival saved live')};
function festivalRow(f){return{ID:f.id,Festival_Name:f.name,Date:f.date,Audience:f.audience,Reminder:f.reminder?'Yes':'No'}}
let festRows=(withId=false)=>S.festivals.map(f=>{let r=festivalRow(f);if(!withId)delete r.ID;return r});
$('#downloadFestivalDemo').onclick=()=>exportX('Festival-Calendar-Demo.xlsx',[{Festival_Name:'Diwali',Date:'2026-11-08',Audience:'Customers + Staff',Reminder:'Yes'}]);$('#exportFestivals').onclick=()=>exportX('Festival-Calendar.xlsx',festRows());
$('#festivalImport').onchange=e=>{let f=e.target.files[0];if(!f)return;readSheet(f,async rows=>{S.festivals=rows.filter(x=>x.Festival_Name&&x.Date).map(x=>({id:String(x.ID||('F'+Date.now()+Math.random())),name:x.Festival_Name,date:String(x.Date).slice(0,10),audience:x.Audience||'Customers + Staff',reminder:String(x.Reminder||'Yes').toLowerCase()!=='no'}));localChanged();renderFest();if(hasLive())await remote('replaceFestivals',festRows(true),'Festival calendar imported and synced');else toast('Festival calendar imported')})};

function renderBirth(){let a=[...S.birthdays].sort((x,y)=>x.date.slice(5).localeCompare(y.date.slice(5)));$('#birthdayList').innerHTML=a.length?a.map(b=>`<div class="festival-item"><div><strong>${esc(b.name)}</strong><span class="muted small">${esc(b.type)}${b.notes?' · '+esc(b.notes):''}</span></div><div><strong>${esc(b.date.slice(5))}</strong> <button class="icon-btn" data-bmsg="${b.id}">Message</button> <button class="icon-btn" data-bdel="${b.id}">Delete</button></div></div>`).join(''):'<div class="empty">No birthdays saved.</div>';$$('[data-bdel]').forEach(x=>x.onclick=async()=>{let id=x.dataset.bdel;S.birthdays=S.birthdays.filter(b=>b.id!==id);localChanged();renderBirth();await remote('deleteBirthday',{ID:id},'Birthday deleted')});$$('[data-bmsg]').forEach(x=>x.onclick=()=>{let b=S.birthdays.find(z=>z.id===x.dataset.bmsg);go('studio');$('#templateSelect').value='birthday';reset();if(b)$('#messageBody').value=$('#messageBody').value.replace('{{1}}',b.name);preview()})}
$('#saveBirthday').onclick=async()=>{if(!$('#birthdayName').value||!$('#birthdayDate').value)return toast('Name and birthday required');let b={id:'B'+Date.now(),name:$('#birthdayName').value,date:$('#birthdayDate').value,type:$('#birthdayType').value,notes:$('#birthdayNotes').value};S.birthdays.push(b);localChanged();renderBirth();await remote('saveBirthday',birthdayRow(b),'Birthday saved live')};
function birthdayRow(b){return{ID:b.id,Name:b.name,Birthday:b.date,Type:b.type,Notes:b.notes||''}}
let birthRows=(withId=false)=>S.birthdays.map(b=>{let r=birthdayRow(b);if(!withId)delete r.ID;return r});
$('#downloadBirthdayDemo').onclick=()=>exportX('Birthday-Calendar-Demo.xlsx',[{Name:'Example Customer',Birthday:'1990-10-20',Type:'Customer',Notes:''},{Name:'Example Staff',Birthday:'1995-12-05',Type:'Staff',Notes:''}]);$('#exportBirthdays').onclick=()=>exportX('Birthday-Calendar.xlsx',birthRows());
$('#birthdayImport').onchange=e=>{let f=e.target.files[0];if(!f)return;readSheet(f,async rows=>{S.birthdays=rows.filter(x=>x.Name&&x.Birthday).map(x=>({id:String(x.ID||('B'+Date.now()+Math.random())),name:x.Name,date:String(x.Birthday).slice(0,10),type:x.Type||'Customer',notes:x.Notes||''}));localChanged();renderBirth();if(hasLive())await remote('replaceBirthdays',birthRows(true),'Birthday calendar imported and synced');else toast('Birthday calendar imported')})};

function settings(){$('#companyName').value=S.settings.companyName||'';$('#customerCare').value=S.settings.customerCare||'';$('#productRangeLink').value=S.settings.productRangeLink||'';$('#sheetUrl').value=S.settings.sheetUrl||'';$('#syncKey').value=S.settings.syncKey||''}
$('#saveSettings').onclick=async()=>{S.settings.companyName=$('#companyName').value;S.settings.customerCare=$('#customerCare').value;S.settings.productRangeLink=$('#productRangeLink').value;localChanged();await remote('saveSettings',{companyName:S.settings.companyName,customerCare:S.settings.customerCare,productRangeLink:S.settings.productRangeLink},'Company settings saved')};
$('#connectSheet').onclick=async()=>{S.settings.sheetUrl=$('#sheetUrl').value.trim();S.settings.syncKey=$('#syncKey').value.trim();save();if(!hasLive())return toast('Enter Web App URL and Sync Key');setSyncState('busy','Testing…');try{await api('ping');setSyncState('live','Live Connected');toast('Google Sheets connection successful');await pullLive(false)}catch(e){setSyncState('pending','Not connected');toast(e.message)}};
$('#pullLive').onclick=()=>pullLive(true);$('#pushLive').onclick=pushAll;
$('#exportBackup').onclick=()=>download('raj-digital-marketing-backup.json',JSON.stringify(S,null,2),'application/json');
$('#importBackup').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let old={sheetUrl:S.settings.sheetUrl,syncKey:S.settings.syncKey};S=JSON.parse(r.result);S.settings={...D.defaultSettings,...(S.settings||{}),...old};S.templates=D.templates;save();location.reload()}catch{toast('Invalid backup')}};r.readAsText(f)};

function check(){let n=new Date(),t=iso(n),tom=new Date(n);tom.setDate(n.getDate()+1);let tm=iso(tom),hit,kind;for(let f of S.festivals.filter(x=>x.reminder)){if(f.date===tm&&!S.remindersSeen[f.id+'pre']){hit=f;kind='pre';break}if(f.date===t&&(n.getHours()>10||(n.getHours()===10&&n.getMinutes()>=30))&&!S.remindersSeen[f.id+'day']){hit=f;kind='day';break}}if(!hit){for(let b of S.birthdays){if(b.date.slice(5)===t.slice(5)&&!S.remindersSeen[b.id+t]){hit=b;kind='birthday';break}}}if(hit){$('#reminderTitle').textContent=kind==='pre'?`Tomorrow: ${hit.name}`:kind==='birthday'?`Birthday Today: ${hit.name}`:`Today: ${hit.name}`;$('#reminderText').textContent=kind==='pre'?`Tomorrow is ${hit.name}. Prepare the wishing message today.`:kind==='birthday'?`Prepare and send the birthday wishing message for ${hit.name}.`:`Today is ${hit.name}. Prepare/send the festival wishing message.`;$('#reminderModal').classList.remove('hidden');$('#reminderDone').onclick=()=>{S.remindersSeen[kind==='birthday'?hit.id+t:hit.id+kind]=1;save();$('#reminderModal').classList.add('hidden')}}}
$('#closeReminder').onclick=()=>$('#reminderModal').classList.add('hidden');
$('#notifyBtn').onclick=async()=>{if('Notification'in window)toast(await Notification.requestPermission()==='granted'?'Notifications enabled':'Permission not granted')};

$('#calendarMonth').value=month(new Date());renderCal();renderFest();renderBirth();settings();check();setInterval(check,60000);
if(hasLive()){setSyncState('busy','Connecting…');pullLive(false)}else setSyncState('local','Local Mode');
})();
