const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let state = { posts: [], timeline: [], gitStatus: '' };
let activeView = 'posts';
let selectedPostSlug = null;
let selectedTimelineId = null;
let postIsNew = false;
let timelineIsNew = false;
let dirty = false;
let busy = false;
let toastTimer = 0;

function currentTheme() { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
function updateThemeToggle() {
  const theme = currentTheme();
  const toggle = $('#theme-toggle');
  const label = $('#theme-toggle-label');
  if (label) label.textContent = theme === 'dark' ? '浅色' : '深色';
  if (toggle) {
    const target = theme === 'dark' ? '浅色' : '深色';
    toggle.setAttribute('aria-label', `切换为${target}背景`);
    toggle.title = `切换为${target}背景`;
  }
}
function setTheme(theme, persist = true) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  if (persist) localStorage.setItem('xycdev-editor-theme', next);
  updateThemeToggle();
}

function escapeHtml(value = '') { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function tagsFrom(value) { return [...new Set(String(value || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))]; }
function localDate() { const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function localDateTimeInput(date = new Date()) { const d = date instanceof Date ? date : new Date(date); const local = new Date(d.getTime() - d.getTimezoneOffset()*60000); return local.toISOString().slice(0,16); }
function setDirty(value = true) {
  dirty = value;
  const el = activeView === 'timeline' ? $('#timeline-save-state') : $('#post-save-state');
  if (!el) return;
  el.textContent = value ? '有未保存修改' : '已保存';
  el.classList.toggle('dirty', value); el.classList.toggle('saved', !value);
}
function setBusy(value, text = '') {
  busy = value;
  $('#status-dot').className = `status-dot ${value ? 'busy' : 'ok'}`;
  $('#status-text').textContent = text || (value ? '正在执行…' : '本地编辑器已连接');
  $$('.button').forEach((button) => { if (button.id !== 'clear-log' && button.id !== 'theme-toggle') button.disabled = value; });
}
function showError(message) { $('#status-dot').className='status-dot error'; $('#status-text').textContent='操作失败'; toast(message, true); }
function toast(message, error = false) { const el=$('#toast'); clearTimeout(toastTimer); el.textContent=message; el.className=`toast show${error?' error':''}`; toastTimer=setTimeout(()=>el.className='toast',3200); }
function log(text, replace = false) { const el=$('#operation-log'); const value=String(text || '').trim(); el.textContent = replace ? value : `${el.textContent === '尚未执行操作。' ? '' : el.textContent + '\n'}${value}`; el.scrollTop=el.scrollHeight; }

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) { headers['Content-Type']='application/json'; headers['X-Blog-Admin']='1'; options.body=JSON.stringify(options.body); }
  const response = await fetch(path, { ...options, headers, cache:'no-store' });
  const data = await response.json().catch(()=>({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `${response.status} ${response.statusText}`);
  return data;
}

function switchView(view) {
  if (dirty && view !== activeView && !confirm('当前有未保存修改，仍然切换吗？')) return;
  dirty = false; activeView = view;
  $$('.nav-item').forEach((item)=>item.classList.toggle('is-active', item.dataset.view===view));
  $$('[data-view-panel]').forEach((panel)=>{ const active=panel.dataset.viewPanel===view; panel.hidden=!active; panel.classList.toggle('is-active',active); });
  if (view === 'publish') refreshStatus();
}

function renderPostList() {
  const query=$('#post-search').value.trim().toLowerCase();
  const posts=[...state.posts].sort((a,b)=>b.date.localeCompare(a.date)).filter((post)=>!query || `${post.slug} ${post.title.zh} ${post.title.en}`.toLowerCase().includes(query));
  $('#posts-count').textContent=state.posts.length;
  $('#post-list').innerHTML = posts.length ? posts.map((post)=>`<button class="collection-item${post.slug===selectedPostSlug?' is-active':''}" type="button" data-post-slug="${escapeHtml(post.slug)}"><strong>${escapeHtml(post.title.zh || post.title.en)}</strong><div class="meta"><span class="tag-dot"></span><span>${escapeHtml(post.date)}</span><span>${escapeHtml(post.category)}</span>${post.featured?'<span>置顶</span>':''}</div></button>`).join('') : '<div class="collection-empty">没有匹配的文章。</div>';
  $$('[data-post-slug]').forEach((button)=>button.addEventListener('click',()=>openPost(button.dataset.postSlug)));
}

function estimateReadingTime(markdown = '') {
  const source = String(markdown || '');
  const images = [...source.matchAll(/!\[[^\]]*\]\([^\s)]+\)/g)].length;
  const text = source
    .replace(/!\[[^\]]*\]\([^\s)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*|```$/g, ' '))
    .replace(/[`*_>#~-]/g, ' ');
  const cjkChars = (text.match(/[\p{Script=Han}]/gu) || []).length;
  const latinWords = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  const textSeconds = (cjkChars / 500) * 60 + (latinWords / 238) * 60;
  let imageSeconds = 0;
  for (let i = 0; i < images; i += 1) imageSeconds += Math.max(3, 12 - i);
  return { minutes: Math.max(1, Math.ceil((textSeconds + imageSeconds) / 60)), cjkChars, latinWords, images };
}
function updateReadingTimeEstimate() {
  const zh = estimateReadingTime($('#post-body-zh').value);
  const en = estimateReadingTime($('#post-body-en').value);
  const images = Math.max(zh.images, en.images);
  $('#post-reading-time').textContent = `中文 ${zh.minutes} 分钟 · EN ${en.minutes} min${images ? ` · ${images} 图` : ''}`;
  $('#post-reading-time').title = `自动估算：中文约 500 字/分钟，英文约 238 词/分钟；图片从 12 秒/张递减至 3 秒/张。`;
}
function emptyPost() { return { slug:'',date:localDate(),category:'tech',featured:false,tags:[],timelineTags:['tech'],title:{zh:'',en:''},summary:{zh:'',en:''},timelineSummary:{zh:'',en:''},body:{zh:'',en:''} }; }
function openPost(slug, post = null) {
  if (dirty && selectedPostSlug !== slug && !confirm('当前文章有未保存修改，仍然切换吗？')) return;
  const item=post || state.posts.find((p)=>p.slug===slug); if (!item) return;
  selectedPostSlug = slug || null; postIsNew=!slug;
  $('#post-editor-empty').hidden=true; $('#post-editor').hidden=false;
  $('#post-slug').value=item.slug || ''; $('#post-date').value=item.date || localDate(); $('#post-category').value=item.category || 'tech'; $('#post-tags').value=(item.tags||[]).join(', '); $('#post-timeline-tags').value=(item.timelineTags||[]).join(', '); $('#post-featured').checked=Boolean(item.featured);
  $('#post-title-zh').value=item.title?.zh || ''; $('#post-title-en').value=item.title?.en || ''; $('#post-summary-zh').value=item.summary?.zh || ''; $('#post-summary-en').value=item.summary?.en || ''; $('#post-timeline-summary-zh').value=item.timelineSummary?.zh || ''; $('#post-timeline-summary-en').value=item.timelineSummary?.en || ''; $('#post-body-zh').value=item.body?.zh || ''; $('#post-body-en').value=item.body?.en || '';
  updateMarkdownPreviews(); renderPostList(); setDirty(false); $('#post-save-state').textContent=postIsNew?'新文章，尚未保存':'已保存';
  $('#delete-post').hidden=postIsNew; $('#preview-post').disabled=postIsNew;
}
function collectPost() {
  return { slug:$('#post-slug').value.trim().toLowerCase(),date:$('#post-date').value,category:$('#post-category').value,featured:$('#post-featured').checked,tags:tagsFrom($('#post-tags').value),timelineTags:tagsFrom($('#post-timeline-tags').value),title:{zh:$('#post-title-zh').value.trim(),en:$('#post-title-en').value.trim()},summary:{zh:$('#post-summary-zh').value.trim(),en:$('#post-summary-en').value.trim()},timelineSummary:{zh:$('#post-timeline-summary-zh').value.trim(),en:$('#post-timeline-summary-en').value.trim()},body:{zh:$('#post-body-zh').value,en:$('#post-body-en').value} };
}
async function savePost() {
  const form=$('#post-editor'); if (!form.reportValidity()) return;
  const payload=collectPost(); if (!payload.title.zh && !payload.title.en) return toast('至少填写一个标题',true);
  setBusy(true,'正在保存并生成页面…');
  try {
    const old=selectedPostSlug; const data=await request(postIsNew?'/api/posts':`/api/posts/${encodeURIComponent(old)}`,{method:postIsNew?'POST':'PUT',body:payload});
    state=data.state; selectedPostSlug=data.post.slug; postIsNew=false; renderPostList(); $('#delete-post').hidden=false; $('#preview-post').disabled=false; setDirty(false); toast('文章已保存，预览已更新'); updateCountsAndStatus();
  } catch(e){ showError(e.message); } finally { setBusy(false); }
}
async function deletePost() {
  if (!selectedPostSlug) return; const post=state.posts.find((p)=>p.slug===selectedPostSlug);
  if (!await askConfirm('删除文章',`确定删除“${post?.title?.zh || selectedPostSlug}”吗？内容文件和生成的文章页都会移除。`,'删除')) return;
  setBusy(true,'正在删除文章…');
  try { const data=await request(`/api/posts/${encodeURIComponent(selectedPostSlug)}`,{method:'DELETE',body:{}}); state=data.state; selectedPostSlug=null; $('#post-editor').hidden=true; $('#post-editor-empty').hidden=false; renderPostList(); setDirty(false); toast('文章已删除'); updateCountsAndStatus(); } catch(e){showError(e.message)} finally{setBusy(false)}
}

function markdown(text='') {
  const lines=String(text).replace(/\r\n?/g,'\n').split('\n'); let out='', paragraph=[], list=[], code=null;
  const inline=(value)=>{ let x=escapeHtml(value); x=x.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,'<img src="$2" alt="$1" loading="lazy" decoding="async">').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,'<a href="$2">$1</a>'); return x; };
  const flushP=()=>{ if(paragraph.length){out+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[]}}; const flushL=()=>{if(list.length){out+=`<ul>${list.map(x=>`<li>${inline(x)}</li>`).join('')}</ul>`;list=[]}};
  for(const line of lines){ if(/^```/.test(line)){ if(code!==null){out+=`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;code=null}else{flushP();flushL();code=[]} continue;} if(code!==null){code.push(line);continue;} const h=line.match(/^(#{2,4})\s+(.+)$/); if(h){flushP();flushL();const n=h[1].length;out+=`<h${n}>${inline(h[2])}</h${n}>`;continue;} const q=line.match(/^>\s?(.*)$/);if(q){flushP();flushL();out+=`<blockquote>${inline(q[1])}</blockquote>`;continue;} const li=line.match(/^[-*]\s+(.+)$/);if(li){flushP();list.push(li[1]);continue;} if(!line.trim()){flushP();flushL();continue;} paragraph.push(line.trim()); }
  if(code!==null)out+=`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;flushP();flushL();return out || '<p style="color:var(--muted)">正文预览会显示在这里。</p>';
}
function updateMarkdownPreviews(){ $('#post-body-preview-zh').innerHTML=markdown($('#post-body-zh').value); $('#post-body-preview-en').innerHTML=markdown($('#post-body-en').value); updateReadingTimeEstimate(); }

function renderTimelineList() {
  const entries=[...state.timeline].sort((a,b)=>String(b.date).localeCompare(String(a.date))); $('#timeline-count').textContent=entries.length;
  $('#timeline-list').innerHTML=entries.length?entries.map((entry)=>`<button class="collection-item${entry.id===selectedTimelineId?' is-active':''}" type="button" data-timeline-id="${escapeHtml(entry.id)}"><strong>${escapeHtml((entry.content?.zh||entry.content?.en||'').slice(0,42))}</strong><div class="meta"><span class="tag-dot"></span><span>${escapeHtml(String(entry.date).replace('T',' ').slice(0,16))}</span><span>${escapeHtml((entry.tags||[]).join(' · '))}</span></div></button>`).join(''):'<div class="collection-empty">还没有手动时间线内容。</div>';
  $$('[data-timeline-id]').forEach((button)=>button.addEventListener('click',()=>openTimeline(button.dataset.timelineId)));
}
function emptyTimeline(){return{id:null,date:new Date().toISOString(),tags:['thought'],content:{zh:'',en:''},url:''}}
function openTimeline(id, item=null){ if(dirty&&selectedTimelineId!==id&&!confirm('当前内容有未保存修改，仍然切换吗？'))return; const entry=item||state.timeline.find((e)=>e.id===id);if(!entry)return;selectedTimelineId=id||null;timelineIsNew=!id;$('#timeline-editor-empty').hidden=true;$('#timeline-editor').hidden=false;$('#timeline-date').value=localDateTimeInput(entry.date);$('#timeline-tags').value=(entry.tags||[]).join(', ');$('#timeline-url').value=entry.url||'';$('#timeline-content-zh').value=entry.content?.zh||'';$('#timeline-content-en').value=entry.content?.en||'';renderTimelineList();setDirty(false);$('#timeline-save-state').textContent=timelineIsNew?'新内容，尚未保存':'已保存';$('#delete-timeline').hidden=timelineIsNew}
function collectTimeline(){return{date:new Date($('#timeline-date').value).toISOString(),tags:tagsFrom($('#timeline-tags').value),url:$('#timeline-url').value.trim(),content:{zh:$('#timeline-content-zh').value.trim(),en:$('#timeline-content-en').value.trim()}}}
async function saveTimeline(){const form=$('#timeline-editor');if(!form.reportValidity())return;const payload=collectTimeline();if(!payload.tags.length)return toast('至少添加一个标签',true);if(!payload.content.zh&&!payload.content.en)return toast('至少填写一种语言的内容',true);setBusy(true,'正在保存时间线…');try{const data=await request(timelineIsNew?'/api/timeline':`/api/timeline/${encodeURIComponent(selectedTimelineId)}`,{method:timelineIsNew?'POST':'PUT',body:payload});state=data.state;selectedTimelineId=data.entry.id;timelineIsNew=false;renderTimelineList();$('#delete-timeline').hidden=false;setDirty(false);toast('时间线内容已保存');updateCountsAndStatus()}catch(e){showError(e.message)}finally{setBusy(false)}}
async function deleteTimeline(){if(!selectedTimelineId)return;const entry=state.timeline.find((e)=>e.id===selectedTimelineId);if(!await askConfirm('删除时间线内容',`确定删除“${(entry?.content?.zh||entry?.content?.en||'').slice(0,50)}”吗？`,'删除'))return;setBusy(true,'正在删除…');try{const data=await request(`/api/timeline/${encodeURIComponent(selectedTimelineId)}`,{method:'DELETE',body:{}});state=data.state;selectedTimelineId=null;$('#timeline-editor').hidden=true;$('#timeline-editor-empty').hidden=false;renderTimelineList();setDirty(false);toast('已删除')}catch(e){showError(e.message)}finally{setBusy(false)}}

async function refreshStatus(){try{const data=await request('/api/status');state.gitStatus=data.gitStatus;$('#git-status').textContent=data.gitStatus||'工作区干净';return data}catch(e){$('#git-status').textContent=e.message;showError(e.message)}}
async function buildSite(){setBusy(true,'正在构建与检查…');log('开始构建与检查…',true);try{const data=await request('/api/build',{method:'POST',body:{}});log(data.log||'构建完成',true);state.gitStatus=data.gitStatus;$('#git-status').textContent=data.gitStatus||'工作区干净';toast('构建与检查通过')}catch(e){log(`ERROR\n${e.message}`,false);showError(e.message)}finally{setBusy(false)}}
async function publishSite(){if(dirty)return toast('请先保存当前编辑内容',true);if(!await askConfirm('发布到线上','将构建并校验全部内容，提交博客内容到 GitHub main，然后部署 Cloudflare Pages。','确认发布'))return;setBusy(true,'正在发布到线上…');log('开始生产发布…',true);try{const data=await request('/api/publish',{method:'POST',body:{message:$('#publish-message').value.trim()}});log(data.log||'发布完成',true);state.gitStatus=data.gitStatus;$('#git-status').textContent=data.gitStatus||'工作区干净';toast('发布完成：blog.xycdev.com');$('#status-text').textContent='线上发布完成'}catch(e){log(`ERROR\n${e.message}`,false);showError(e.message)}finally{setBusy(false)}}

function askConfirm(title, copy, actionLabel='确认') { const dialog=$('#confirm-dialog');$('#confirm-title').textContent=title;$('#confirm-copy').textContent=copy;$('#confirm-action').textContent=actionLabel;dialog.showModal();return new Promise((resolve)=>{const onClose=()=>{dialog.removeEventListener('close',onClose);resolve(dialog.returnValue==='confirm')};dialog.addEventListener('close',onClose)}) }
function updateCountsAndStatus(){ $('#posts-count').textContent=state.posts.length;$('#timeline-count').textContent=state.timeline.length;$('#git-status').textContent=state.gitStatus||'工作区干净'; }

updateThemeToggle();
$('#theme-toggle').addEventListener('click',()=>setTheme(currentTheme()==='dark'?'light':'dark'));
$$('.nav-item').forEach((item)=>item.addEventListener('click',()=>switchView(item.dataset.view)));
$('#top-publish').addEventListener('click',()=>switchView('publish'));
$('#new-post').addEventListener('click',()=>{if(dirty&&!confirm('当前有未保存修改，仍然新建吗？'))return;selectedPostSlug=null;openPost(null,emptyPost())});
$('#post-search').addEventListener('input',renderPostList);
$('#post-editor').addEventListener('submit',(e)=>{e.preventDefault();savePost()});
$('#delete-post').addEventListener('click',deletePost);
$('#preview-post').addEventListener('click',()=>{const slug=$('#post-slug').value.trim();if(slug)window.open(`/posts/${encodeURIComponent(slug)}.html`,'_blank','noopener')});
$('#post-editor').addEventListener('input',(e)=>{if(e.target.matches('input,textarea,select')){setDirty(true);if(e.target.id==='post-body-zh'||e.target.id==='post-body-en')updateMarkdownPreviews()}});
$$('[data-edit-lang]').forEach((button)=>button.addEventListener('click',()=>{const lang=button.dataset.editLang;$$('[data-edit-lang]').forEach((b)=>b.classList.toggle('is-active',b===button));$$('[data-lang-panel]').forEach((p)=>{const a=p.dataset.langPanel===lang;p.hidden=!a;p.classList.toggle('is-active',a)})}));
$('#new-timeline').addEventListener('click',()=>{if(dirty&&!confirm('当前有未保存修改，仍然新建吗？'))return;selectedTimelineId=null;openTimeline(null,emptyTimeline())});
$('#timeline-editor').addEventListener('submit',(e)=>{e.preventDefault();saveTimeline()});$('#delete-timeline').addEventListener('click',deleteTimeline);$('#preview-timeline').addEventListener('click',()=>window.open('/timeline.html','_blank','noopener'));$('#timeline-editor').addEventListener('input',(e)=>{if(e.target.matches('input,textarea,select'))setDirty(true)});
$$('[data-timeline-lang]').forEach((button)=>button.addEventListener('click',()=>{const lang=button.dataset.timelineLang;$$('[data-timeline-lang]').forEach((b)=>b.classList.toggle('is-active',b===button));$$('[data-timeline-lang-panel]').forEach((p)=>{const a=p.dataset.timelineLangPanel===lang;p.hidden=!a;p.classList.toggle('is-active',a)})}));
$('#refresh-status').addEventListener('click',refreshStatus);$('#build-site').addEventListener('click',buildSite);$('#publish-site').addEventListener('click',publishSite);$('#clear-log').addEventListener('click',()=>log('尚未执行操作。',true));
document.addEventListener('keydown',(e)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(activeView==='posts'&&!$('#post-editor').hidden)savePost();if(activeView==='timeline'&&!$('#timeline-editor').hidden)saveTimeline()}});
window.addEventListener('beforeunload',(e)=>{if(dirty){e.preventDefault();e.returnValue=''}});

async function init(){setBusy(true,'正在读取博客内容…');try{state=await request('/api/state');renderPostList();renderTimelineList();updateCountsAndStatus();if(state.posts.length)openPost([...state.posts].sort((a,b)=>b.date.localeCompare(a.date))[0].slug);setDirty(false);$('#status-dot').className='status-dot ok';$('#status-text').textContent='本地编辑器已连接'}catch(e){showError(`无法连接本地编辑器：${e.message}`);log(e.stack||e.message,true)}finally{setBusy(false)}}
init();
