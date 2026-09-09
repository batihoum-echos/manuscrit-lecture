
const state = {
  units: [],
  current: Number(localStorage.getItem('chapter')) || 0,
  font: Number(localStorage.getItem('font')) || 20,
  theme: localStorage.getItem('theme') || 'light',
  data: null
};

const $ = id => document.getElementById(id);
const esc = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function inlineMarkdown(text=''){
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g,'<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return out;
}

function parseMarkdown(md){
  const lines = md.replace(/\r/g,'').split('\n');
  const units = [];
  let current = null, group = '', mode = 'body';
  const note = [];
  let quote = '';

  function flush(){
    if(current){
      current.paragraphs = current.paragraphs.filter(Boolean);
      units.push(current);
      current = null;
    }
  }

  for(let line of lines){
    const t = line.trim();
    if(/^#\s+ÉCHOS\s*$/.test(t)) continue;
    if(/^##\s+Des lieux, des êtres et du temps qui passe\s*$/.test(t)) continue;
    if(/^>\s*Édition personnelle provisoire/.test(t) || /^>\s*Septembre 2026/.test(t)) continue;

    if(/^##\s+Note liminaire\s*$/.test(t)){ flush(); mode='note'; continue; }
    if(/^#\s+Ouverture\s*$/.test(t)){ flush(); group=''; mode='body'; current={title:'Ouverture',group,paragraphs:[]}; continue; }
    if(/^#\s+I\.\s+Les lieux\s*$/.test(t)){ flush(); group='I. Les lieux'; mode='body'; continue; }
    if(/^#\s+II\.\s+Les êtres\s*$/.test(t)){ flush(); group='II. Les êtres'; mode='body'; continue; }
    if(/^#\s+III\.\s+Le temps\s*$/.test(t)){ flush(); group='III. Le temps'; mode='body'; continue; }
    if(/^#\s+Clôture\s*$/.test(t)){ flush(); group=''; mode='body'; current={title:'Clôture',group,paragraphs:[]}; continue; }
    if(/^#\s+Annexes\s*$/.test(t)){ flush(); group='Annexes'; mode='body'; continue; }

    if(/^##\s+/.test(t)){
      const title = t.replace(/^##\s+/,'').trim();
      if(mode==='note' && title==='Note liminaire') continue;
      flush();
      current={title,group,paragraphs:[]};
      mode='body';
      continue;
    }

    if(mode==='note'){
      if(/^>\s?/.test(t)){
        const q=t.replace(/^>\s?/,'').trim();
        if(q) quote = quote ? `${quote} ${q}` : q;
      }else if(t){
        note.push(t);
      }
      continue;
    }

    if(!current || !t) continue;
    current.paragraphs.push(t.replace(/^>\s?/,''));
  }
  flush();
  return {units,noteLiminaire:note,exergue:quote};
}

function groupData(){
  const ordered = [];
  for(const u of state.units){
    let g = ordered.find(x=>x.name===u.group);
    if(!g){ g={name:u.group,items:[]}; ordered.push(g); }
    g.items.push(u);
  }
  return ordered;
}

function renderToc(){
  const html = groupData().map(g => `
    ${g.name ? `<div class="toc-group">${esc(g.name)}</div>` : ''}
    ${g.items.map(u => `<button class="chapter-link ${state.units.indexOf(u)===state.current?'active':''}" data-i="${state.units.indexOf(u)}">${esc(u.title)}</button>`).join('')}
  `).join('');
  $('toc').innerHTML=html;
  $('toc').querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click',()=>openChapter(Number(btn.dataset.i)));
  });
  const grid = groupData().map(g=>`
    <div class="toc-card">
      <div class="toc-card-title">${esc(g.name || 'PRÉAMBULE')}</div>
      ${g.items.map(u=>`<button data-i="${state.units.indexOf(u)}">${esc(u.title)}</button>`).join('')}
    </div>`).join('');
  $('tocGrid').innerHTML=grid;
  $('tocGrid').querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click',()=>openChapter(Number(btn.dataset.i)));
  });
}

function applyTheme(){
  document.documentElement.dataset.theme = state.theme==='light' ? '' : state.theme;
  document.documentElement.style.setProperty('--size', `${Math.max(17,Math.min(27,state.font))}px`);
}

function save(){
  localStorage.setItem('chapter',String(state.current));
  localStorage.setItem('font',String(state.font));
  localStorage.setItem('theme',state.theme);
}

function minutesFor(unit){
  const words = unit.paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1,Math.round(words/190));
}

function openHome(){
  $('homeView').classList.remove('hidden');
  $('chapterView').classList.add('hidden');
  $('searchView').classList.add('hidden');
  $('currentTitle').textContent='ÉCHOS';
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

function openChapter(index){
  if(index<0 || index>=state.units.length) return;
  state.current=index;
  const u=state.units[index];
  $('homeView').classList.add('hidden');
  $('searchView').classList.add('hidden');
  $('chapterView').classList.remove('hidden');
  $('currentTitle').textContent=u.title;
  $('chapterSection').textContent=u.group || 'PRÉAMBULE';
  $('chapterTitle').textContent=u.title;
  $('chapterMeta').textContent=`${minutesFor(u)} min de lecture · ${index+1} / ${state.units.length}`;
  $('chapterText').innerHTML=u.paragraphs.map(p=>`<p>${inlineMarkdown(p)}</p>`).join('');
  const prev=state.units[index-1], next=state.units[index+1];
  $('prevBtn').disabled=!prev;
  $('nextBtn').disabled=!next;
  $('prevTitle').textContent=prev ? prev.title : 'Début du manuscrit';
  $('nextTitle').textContent=next ? next.title : 'Fin du manuscrit';
  document.querySelectorAll('#toc .chapter-link').forEach(b=>b.classList.toggle('active',Number(b.dataset.i)===index));
  save();
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

function openSearch(){
  $('homeView').classList.add('hidden');
  $('chapterView').classList.add('hidden');
  $('searchView').classList.remove('hidden');
  closeSidebar();
  $('currentTitle').textContent='Recherche';
  $('searchInput').value='';
  $('searchCount').textContent='';
  $('searchResults').innerHTML='';
  $('searchInput').focus();
}

function renderSearch(q){
  q=q.trim().toLowerCase();
  if(!q){ $('searchCount').textContent=''; $('searchResults').innerHTML=''; return; }
  const results=[];
  state.units.forEach((u,i)=>u.paragraphs.forEach(p=>{
    const low=p.toLowerCase(), at=low.indexOf(q);
    if(at>=0) results.push({i,title:u.title,p,at});
  }));
  $('searchCount').textContent=`${results.length} résultat${results.length===1?'':'s'}`;
  $('searchResults').innerHTML=results.slice(0,100).map(r=>{
    const a=Math.max(0,r.at-100), b=Math.min(r.p.length,r.at+q.length+120);
    const raw=r.p.slice(a,b), low=raw.toLowerCase(), pos=low.indexOf(q);
    let snippet=inlineMarkdown(raw);
    if(pos>=0) snippet=esc(raw.slice(0,pos))+`<mark>${esc(raw.slice(pos,pos+q.length))}</mark>`+esc(raw.slice(pos+q.length));
    return `<div class="result" data-i="${r.i}"><div class="result-title">${esc(r.title)}</div><div class="result-snippet">… ${snippet} …</div></div>`;
  }).join('');
  $('searchResults').querySelectorAll('.result').forEach(x=>x.addEventListener('click',()=>openChapter(Number(x.dataset.i))));
}

function toggleSidebar(){
  $('sidebar').classList.toggle('open');
  $('backdrop').classList.toggle('hidden');
}

async function init(){
  try{
    const res=await fetch('content/manuscrit.md',{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=parseMarkdown(await res.text());
    state.data=data;
    state.units=data.units;
    if(state.current<0 || state.current>=state.units.length) state.current=0;
    state.font=Math.max(17,Math.min(27,state.font));
    $('heroQuote').textContent=data.exergue || 'Ce qui survit à l’oubli ne reconstitue pas une existence. Cela en garde les échos.';
    applyTheme(); renderToc(); updateResume();
    $('chapterView').classList.add('hidden');
  }catch(err){
    console.error(err);
    $('heroQuote').textContent='Impossible de charger le manuscrit.';
  }
}

function updateResume(){
  const hasSaved=localStorage.getItem('chapter')!==null;
  $('resumeBtn').textContent=hasSaved ? 'Reprendre ma lecture' : 'Commencer la lecture';
}

$('brandBtn').addEventListener('click',openHome);
$('menuBtn').addEventListener('click',toggleSidebar);
$('closeMenu').addEventListener('click',toggleSidebar);
$('backdrop').addEventListener('click',toggleSidebar);
$('resumeBtn').addEventListener('click',()=>openChapter(state.current));
$('tocHomeBtn').addEventListener('click',()=>toggleSidebar());
$('prevBtn').addEventListener('click',()=>openChapter(state.current-1));
$('nextBtn').addEventListener('click',()=>openChapter(state.current+1));
$('searchBtn').addEventListener('click',openSearch);
$('themeBtn').addEventListener('click',()=>{
  state.theme=state.theme==='light'?'sepia':state.theme==='sepia'?'dark':'light';
  applyTheme(); save();
});
$('textMinus').addEventListener('click',()=>{state.font=Math.max(17,state.font-1);applyTheme();save();});
$('textPlus').addEventListener('click',()=>{state.font=Math.min(27,state.font+1);applyTheme();save();});
$('searchInput').addEventListener('input',e=>renderSearch(e.target.value));
window.addEventListener('scroll',()=>{
  const d=document.documentElement, max=d.scrollHeight-d.clientHeight;
  $('progressBar').style.width=`${max>0?(d.scrollTop/max)*100:0}%`;
});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ closeSidebar(); }
  if(e.key==='/' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); openSearch(); }
  if(e.key==='ArrowRight' && !e.altKey && $('chapterView').classList.contains('hidden')===false) openChapter(state.current+1);
  if(e.key==='ArrowLeft' && !e.altKey && $('chapterView').classList.contains('hidden')===false) openChapter(state.current-1);
});

function closeSidebar(){
  $('sidebar').classList.remove('open');
  $('backdrop').classList.add('hidden');
}

init();
