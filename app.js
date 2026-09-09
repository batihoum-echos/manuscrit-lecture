const state = {
  units: [],
  current: 0,
  font: Number(localStorage.getItem('font')) || 19,
  theme: localStorage.getItem('theme') || 'light'
};

const $ = (id) => document.getElementById(id);
const STORAGE_CHAPTER = 'chapter';

function esc(value = '') {
  return value.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function inlineMarkdown(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

function parseMarkdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const units = [];
  let current = null;
  let group = '';
  let note = [];
  let quote = '';
  let mode = 'body';

  const flush = () => {
    if (current) {
      current.paragraphs = current.paragraphs.filter(Boolean);
      units.push(current);
      current = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#\s+ÉCHOS\s*$/.test(line)) continue;
    if (/^##\s+Des lieux, des êtres et du temps qui passe\s*$/.test(line)) continue;
    if (/^>\s*Édition personnelle provisoire/.test(line) || /^>\s*Septembre 2026/.test(line)) continue;

    if (/^##\s+Note liminaire\s*$/.test(line)) {
      flush(); mode = 'note'; continue;
    }
    if (/^#\s+Ouverture\s*$/.test(line)) {
      flush(); group = ''; current = { title: 'Ouverture', group, paragraphs: [] }; mode = 'body'; continue;
    }
    if (/^#\s+I\.\s+Les lieux\s*$/.test(line)) { flush(); group = 'I. Les lieux'; continue; }
    if (/^#\s+II\.\s+Les êtres\s*$/.test(line)) { flush(); group = 'II. Les êtres'; continue; }
    if (/^#\s+III\.\s+Le temps\s*$/.test(line)) { flush(); group = 'III. Le temps'; continue; }
    if (/^#\s+Clôture\s*$/.test(line)) { flush(); group = ''; current = { title: 'Clôture', group, paragraphs: [] }; mode = 'body'; continue; }
    if (/^#\s+Annexes\s*$/.test(line)) { flush(); group = 'Annexes'; continue; }
    if (/^##\s+/.test(line)) {
      const title = line.replace(/^##\s+/, '').trim();
      if (mode === 'note' && title === 'Note liminaire') continue;
      if (group === 'Annexes' || group === 'I. Les lieux' || group === 'II. Les êtres' || group === 'III. Le temps') {
        flush(); current = { title, group, paragraphs: [] }; mode = 'body'; continue;
      }
      if (mode !== 'note') {
        flush(); current = { title, group, paragraphs: [] }; mode = 'body'; continue;
      }
    }

    if (mode === 'note') {
      if (line.trim().startsWith('>')) {
        const q = line.replace(/^>\s?/, '').trim();
        if (q) quote = quote ? `${quote} ${q}` : q;
      } else if (line.trim()) {
        note.push(line.trim());
      }
      continue;
    }

    if (!current) continue;
    if (line.trim().startsWith('>')) {
      const q = line.replace(/^>\s?/, '').trim();
      if (q) current.paragraphs.push(q);
    } else if (line.trim()) {
      current.paragraphs.push(line.trim());
    }
  }
  flush();

  return { units, noteLiminaire: note, exergue: quote };
}

async function init() {
  try {
    const res = await fetch('content/manuscrit.md', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const data = parseMarkdown(md);
    state.units = data.units;
    const saved = Number(localStorage.getItem(STORAGE_CHAPTER));
    if (Number.isInteger(saved) && saved >= 0 && saved < state.units.length) state.current = saved;
    if (!Number.isFinite(state.font) || state.font < 16 || state.font > 26) state.font = 19;
    applyTheme();
    renderFront(data);
    renderTOC();
    updateResume();
  } catch (error) {
    console.error(error);
    $('noteLiminaire').innerHTML = '<p>Impossible de charger le manuscrit. Vérifiez que le fichier <strong>content/manuscrit.md</strong> est présent.</p>';
  }
}

function save() {
  localStorage.setItem(STORAGE_CHAPTER, String(state.current));
  localStorage.setItem('font', String(state.font));
  localStorage.setItem('theme', state.theme);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme === 'light' ? '' : state.theme;
  document.documentElement.style.setProperty('--size', `${state.font}px`);
}

function renderFront(data) {
  $('noteLiminaire').innerHTML = data.noteLiminaire.map((p) => `<p>${inlineMarkdown(p)}</p>`).join('');
  $('exergue').textContent = data.exergue || '';
}

function renderTOC() {
  const groups = [];
  state.units.forEach((u, index) => {
    const g = u.group || '';
    let grp = groups.find((x) => x.name === g);
    if (!grp) { grp = { name: g, items: [] }; groups.push(grp); }
    grp.items.push({ ...u, index });
  });
  $('toc').innerHTML = groups.map((g) => `${g.name ? `<div class="toc-group">${esc(g.name)}</div>` : ''}${g.items.map((u) => `<button class="chapter-link" data-i="${u.index}">${esc(u.title)}</button>`).join('')}`).join('');
  $('toc').querySelectorAll('button').forEach((b) => b.onclick = () => { openChapter(Number(b.dataset.i)); closeSidebar(); });
}

function updateResume() {
  $('resumeBtn').textContent = localStorage.getItem(STORAGE_CHAPTER) !== null ? 'Reprendre la lecture' : 'Commencer la lecture';
}

function openChapter(index) {
  if (index < 0 || index >= state.units.length) return;
  state.current = index;
  const unit = state.units[index];
  $('home').classList.add('hidden');
  $('searchView').classList.add('hidden');
  $('chapterView').classList.remove('hidden');
  $('chapterMeta').textContent = unit.group || '';
  $('chapterTitle').textContent = unit.title;
  $('chapterText').innerHTML = unit.paragraphs.map((p) => `<p>${inlineMarkdown(p)}</p>`).join('');
  $('prevBtn').disabled = index === 0;
  $('nextBtn').disabled = index === state.units.length - 1;
  document.querySelectorAll('#toc button').forEach((b) => b.classList.toggle('active', Number(b.dataset.i) === index));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  save(); updateResume();
}

function openHome() {
  $('chapterView').classList.add('hidden');
  $('searchView').classList.add('hidden');
  $('home').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSearch() {
  $('home').classList.add('hidden');
  $('chapterView').classList.add('hidden');
  $('searchView').classList.remove('hidden');
  closeSidebar();
  $('searchInput').focus();
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('backdrop').classList.add('hidden');
}

function renderSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) { $('searchCount').textContent = ''; $('searchResults').innerHTML = ''; return; }
  const results = [];
  state.units.forEach((u, i) => u.paragraphs.forEach((p) => {
    const low = p.toLowerCase(); const at = low.indexOf(q);
    if (at >= 0) results.push({ i, title: u.title, p, at });
  }));
  $('searchCount').textContent = `${results.length} résultat${results.length !== 1 ? 's' : ''}`;
  $('searchResults').innerHTML = results.slice(0, 80).map((r) => {
    const a = Math.max(0, r.at - 90), b = Math.min(r.p.length, r.at + Math.max(q.length, 40) + 90);
    const raw = r.p.slice(a, b);
    const lower = raw.toLowerCase(); const pos = lower.indexOf(q);
    let snippet = inlineMarkdown(raw);
    if (pos >= 0) {
      const before = esc(raw.slice(0, pos));
      const match = esc(raw.slice(pos, pos + q.length));
      const after = esc(raw.slice(pos + q.length));
      snippet = `${before}<mark>${match}</mark>${after}`;
    }
    return `<div class="result" data-i="${r.i}"><div class="result-title">${esc(r.title)}</div><div class="result-snippet">… ${snippet} …</div></div>`;
  }).join('');
  $('searchResults').querySelectorAll('.result').forEach((x) => x.onclick = () => openChapter(Number(x.dataset.i)));
}

$('menuBtn').onclick = () => { $('sidebar').classList.add('open'); $('backdrop').classList.remove('hidden'); };
$('closeMenu').onclick = closeSidebar;
$('backdrop').onclick = closeSidebar;
$('resumeBtn').onclick = () => openChapter(state.current);
$('prevBtn').onclick = () => openChapter(state.current - 1);
$('nextBtn').onclick = () => openChapter(state.current + 1);
$('searchBtn').onclick = openSearch;
$('themeBtn').onclick = () => { state.theme = state.theme === 'light' ? 'sepia' : state.theme === 'sepia' ? 'dark' : 'light'; applyTheme(); save(); };
$('textMinus').onclick = () => { state.font = Math.max(16, state.font - 1); applyTheme(); save(); };
$('textPlus').onclick = () => { state.font = Math.min(26, state.font + 1); applyTheme(); save(); };
$('searchInput').addEventListener('input', (e) => renderSearch(e.target.value));
window.addEventListener('scroll', () => { const d = document.documentElement; const max = d.scrollHeight - d.clientHeight; $('progressBar').style.width = `${max ? d.scrollTop / max * 100 : 0}%`; });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); if (e.key === '/' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openSearch(); } });

init();
