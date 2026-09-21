const e=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const list=(arr,fn)=>Array.isArray(arr)?arr.map(fn).join(''):'';
const on=(p,k)=>p?.[k]?.enabled!==false;

export function ensureLandingStyles(){
  if(document.querySelector('#landingPagesStyles'))return;
  const link=document.createElement('link');
  link.id='landingPagesStyles';
  link.rel='stylesheet';
  link.href='/landing-pages.css?v=20260921-1510';
  document.head.appendChild(link);
}

function cta(page,label){
  const p=page.payload||{}, target=p.settings?.primaryCtaTarget||'#oferta';
  return '<a class="ml-cta" href="'+e(target)+'">'+e(label||p.settings?.primaryCta||'QUERO CONHECER O MASSA LIMPA')+'</a>';
}

export function renderMassaLimpa(page){
  ensureLandingStyles();
  const p=page?.payload||{}, hero=p.hero||{}, settings=p.settings||{}, accent=settings.themeAccent||'#E7FF3A';
  const s=[];
  if(on(p,'urgency'))s.push('<div class="ml-urgency"><span>'+e(p.urgency?.icon||'⚠')+'</span><strong>'+e(p.urgency?.text||'')+'</strong></div>');

  s.push('<section class="ml-hero"><div class="ml-shell ml-hero-grid"><div class="ml-hero-copy"><div class="ml-eyebrow">'+e(hero.badge||settings.pageName||page.name)+'</div><h1>'+e(hero.headline||'')+'</h1><p>'+e(hero.subheadline||'')+'</p>'+cta(page)+'<div class="ml-trust">'+list(hero.trust,x=>'<span>✓ '+e(x)+'</span>')+'</div>'+(hero.availability?'<small>'+e(hero.availability)+'</small>':'')+'</div><div class="ml-product-stage">'+(hero.productImage?'<img src="'+e(hero.productImage)+'" alt="'+e(settings.pageName||page.name)+'" loading="eager">':'<div class="ml-product-placeholder"><b>'+e(settings.pageName||page.name)+'</b><span>HERO OBJECT</span><small>Imagem principal editável no admin</small></div>')+'</div></div></section>');

  if(on(p,'curiosity'))s.push('<section class="ml-section ml-center"><div class="ml-shell ml-narrow"><span class="ml-kicker">'+e(p.curiosity?.kicker||'')+'</span><h2>'+e(p.curiosity?.headline||'')+'</h2><p>'+e(p.curiosity?.text||'')+'</p></div></section>');

  if(on(p,'pain'))s.push('<section class="ml-section ml-light"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">IDENTIFICAÇÃO</span><h2>'+e(p.pain?.headline||'')+'</h2></div><div class="ml-card-grid">'+list(p.pain?.cards,x=>'<article class="ml-card"><span>'+e(x.icon||'')+'</span><h3>'+e(x.title||'')+'</h3><p>'+e(x.text||'')+'</p></article>')+'</div></div></section>');

  if(on(p,'belief'))s.push('<section class="ml-section ml-dark"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">QUEBRA DE CRENÇA</span><h2>'+e(p.belief?.headline||'')+'</h2></div><div class="ml-versus"><article><small>'+e(p.belief?.leftTitle||'')+'</small>'+list(p.belief?.leftItems,x=>'<div>— '+e(x)+'</div>')+'</article><div class="ml-vs">VS</div><article class="good"><small>'+e(p.belief?.rightTitle||'')+'</small>'+list(p.belief?.rightItems,x=>'<div>+ '+e(x)+'</div>')+'</article></div></div></section>');

  if(on(p,'mechanism'))s.push('<section class="ml-section ml-mechanism"><div class="ml-shell"><div class="ml-section-head ml-center"><span class="ml-kicker">'+e(p.mechanism?.kicker||'MECANISMO')+'</span><h2>'+e(p.mechanism?.headline||'')+'</h2><p>'+e(p.mechanism?.text||'')+'</p></div><div class="ml-orbit"><div class="ml-orbit-center"><small>SISTEMA</small><strong>'+e(p.mechanism?.center||settings.pageName||page.name)+'</strong></div>'+list(p.mechanism?.nodes,(x,i)=>'<article class="ml-node n'+(i+1)+'"><small>'+e(x.label||'')+'</small><strong>'+e(x.title||'')+'</strong><span>'+e(x.meta||'')+'</span></article>')+'</div></div></section>');

  if(on(p,'components'))s.push('<section class="ml-section ml-black"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">'+e(p.components?.kicker||'')+'</span><h2>'+e(p.components?.headline||'')+'</h2></div><div class="ml-component-list">'+list(p.components?.items,x=>'<article class="ml-component"><div class="ml-component-num">'+e(x.number||'')+'</div><div class="ml-component-visual">'+(x.image?'<img src="'+e(x.image)+'" alt="" loading="lazy">':'<span>'+e(x.number||'')+'</span>')+'</div><div><small>'+e(x.subtitle||'')+'</small><h3>'+e(x.title||'')+'</h3><p>'+e(x.text||'')+'</p></div></article>')+'</div>'+(p.components?.equation?'<div class="ml-equation">'+e(p.components.equation)+'</div>':'')+'</div></section>');

  if(on(p,'reveal'))s.push('<section class="ml-section ml-reveal"><div class="ml-shell ml-reveal-grid"><div><span class="ml-kicker">'+e(p.reveal?.kicker||'')+'</span><h2>'+e(p.reveal?.headline||'')+'</h2><p>'+e(p.reveal?.text||'')+'</p>'+cta(page,'QUERO CONHECER A OFERTA')+'</div><div class="ml-reveal-object">'+(p.reveal?.image?'<img src="'+e(p.reveal.image)+'" alt="" loading="lazy">':'<strong>'+e(settings.pageName||page.name)+'</strong>')+'</div></div></section>');

  if(on(p,'how'))s.push('<section class="ml-section ml-light"><div class="ml-shell"><div class="ml-section-head ml-center"><span class="ml-kicker">COMO FUNCIONA</span><h2>'+e(p.how?.headline||'')+'</h2></div><div class="ml-step-grid">'+list(p.how?.steps,x=>'<article><span>'+e(x.number||'')+'</span><h3>'+e(x.title||'')+'</h3><p>'+e(x.text||'')+'</p></article>')+'</div></div></section>');

  if(on(p,'forWho'))s.push('<section class="ml-section"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">QUALIFICAÇÃO</span><h2>'+e(p.forWho?.headline||'')+'</h2></div><div class="ml-card-grid">'+list(p.forWho?.cards,x=>'<article class="ml-card ml-check"><span>✓</span><h3>'+e(x.title||'')+'</h3><p>'+e(x.text||'')+'</p></article>')+'</div></div></section>');

  if(on(p,'notForWho'))s.push('<section class="ml-strip"><div class="ml-shell"><h2>'+e(p.notForWho?.headline||'')+'</h2><div class="ml-strip-items">'+list(p.notForWho?.items,x=>'<span>× '+e(x)+'</span>')+'</div></div></section>');

  if(on(p,'transformation'))s.push('<section class="ml-section ml-light"><div class="ml-shell"><div class="ml-section-head ml-center"><span class="ml-kicker">TRANSFORMAÇÃO DA EXPERIÊNCIA</span><h2>'+e(p.transformation?.headline||'')+'</h2></div><div class="ml-before-after"><article><small>ANTES</small>'+list(p.transformation?.before,x=>'<div>— '+e(x)+'</div>')+'</article><article class="after"><small>DEPOIS</small>'+list(p.transformation?.after,x=>'<div>+ '+e(x)+'</div>')+'</article></div></div></section>');

  if(on(p,'proof'))s.push('<section class="ml-section ml-black"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">PROVA</span><h2>'+e(p.proof?.headline||'')+'</h2><p>'+e(p.proof?.note||'')+'</p></div>'+((p.proof?.testimonials||[]).length?'<div class="ml-testimonials">'+list(p.proof.testimonials,x=>'<article><strong>'+e(x.name||'')+'</strong><p>'+e(x.text||'')+'</p></article>')+'</div>':'<div class="ml-empty-proof">Área preparada para depoimentos reais e autorizados.</div>')+'</div></section>');

  if(on(p,'authority'))s.push('<section class="ml-section"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">CREDIBILIDADE</span><h2>'+e(p.authority?.headline||'')+'</h2></div><div class="ml-card-grid">'+list(p.authority?.cards,x=>'<article class="ml-card"><h3>'+e(x.title||'')+'</h3><p>'+e(x.text||'')+'</p></article>')+'</div></div></section>');

  if(on(p,'included'))s.push('<section class="ml-section ml-light"><div class="ml-shell"><div class="ml-section-head ml-center"><span class="ml-kicker">O QUE ESTÁ INCLUÍDO</span><h2>'+e(p.included?.headline||'')+'</h2></div><div class="ml-included-grid">'+list(p.included?.items,x=>'<article><div class="ml-included-visual">'+(x.image?'<img src="'+e(x.image)+'" alt="" loading="lazy">':'<span>'+e(x.type||'ITEM')+'</span>')+'</div><small>'+e(x.type||'')+'</small><h3>'+e(x.name||'')+'</h3><p>'+e(x.description||'')+'</p><strong>'+e(x.value||'')+'</strong></article>')+'</div></div></section>');

  if(on(p,'bonuses'))s.push('<section class="ml-section"><div class="ml-shell"><div class="ml-section-head"><span class="ml-kicker">BÔNUS</span><h2>'+e(p.bonuses?.headline||'')+'</h2></div><div class="ml-bonus-grid">'+list(p.bonuses?.items,x=>'<article><span>'+e(x.icon||'+')+'</span><h3>'+e(x.name||'')+'</h3><p>'+e(x.benefit||'')+'</p><strong>'+e(x.value||'')+'</strong></article>')+'</div></div></section>');

  if(on(p,'valueStack'))s.push('<section class="ml-section ml-dark" id="oferta"><div class="ml-shell ml-value-layout"><div><span class="ml-kicker">STACK DE VALOR</span><h2>'+e(p.valueStack?.headline||'')+'</h2><div class="ml-value-lines">'+list(p.valueStack?.lines,x=>'<div><span>'+e(x.label||'')+'</span><strong>'+e(x.value||'')+'</strong></div>')+'</div></div><aside class="ml-total-card"><small>'+e(p.valueStack?.totalLabel||'')+'</small><strong>'+e(p.valueStack?.totalValue||'')+'</strong><span>'+e(p.valueStack?.conditionLabel||'')+'</span></aside></div></section>');

  if(on(p,'plans'))s.push('<section class="ml-section ml-plans"><div class="ml-shell"><div class="ml-section-head ml-center"><span class="ml-kicker">OPÇÕES</span><h2>'+e(p.plans?.headline||'')+'</h2></div><div class="ml-plan-grid">'+list(p.plans?.items,x=>'<article class="ml-plan '+(x.badge?'featured':'')+'">'+(x.badge?'<div class="ml-plan-badge">'+e(x.badge)+'</div>':'')+'<small>'+e(x.qty||'')+'</small><h3>'+e(x.name||'')+'</h3><p>'+e(x.description||'')+'</p>'+(x.oldPrice?'<del>'+e(x.oldPrice)+'</del>':'')+'<strong>'+e(x.price||'')+'</strong><span>'+e(x.economy||'')+'</span>'+cta(page,x.cta||settings.primaryCta)+'</article>')+'</div></div></section>');

  if(on(p,'protection'))s.push('<section class="ml-section ml-light"><div class="ml-shell"><div class="ml-protection"><div class="ml-shield">◆</div><div><span class="ml-kicker">PROTEÇÃO DA COMPRA</span><h2>'+e(p.protection?.headline||'')+'</h2><p>'+e(p.protection?.text||'')+'</p><div class="ml-protection-bullets">'+list(p.protection?.bullets,x=>'<span>✓ '+e(x)+'</span>')+'</div></div></div></div></section>');

  if(on(p,'availability'))s.push('<section class="ml-availability"><div class="ml-shell"><div><span class="ml-kicker">DISPONIBILIDADE</span><h2>'+e(p.availability?.headline||'')+'</h2><p>'+e(p.availability?.text||'')+'</p></div><aside><small>STATUS</small><strong>'+e(p.availability?.status||'')+'</strong>'+cta(page)+'</aside></div></section>');

  if(on(p,'faq'))s.push('<section class="ml-section ml-light"><div class="ml-shell ml-narrow"><div class="ml-section-head ml-center"><span class="ml-kicker">FAQ</span><h2>'+e(p.faq?.headline||'')+'</h2></div><div class="ml-faq">'+list(p.faq?.items,(x,i)=>'<details '+(i===0?'open':'')+'><summary>'+e(x.q||'')+'</summary><p>'+e(x.a||'')+'</p></details>')+'</div></div></section>');

  if(on(p,'finalCta'))s.push('<section class="ml-final"><div class="ml-shell ml-narrow"><span class="ml-kicker">MASSA LIMPA</span><h2>'+e(p.finalCta?.headline||'')+'</h2><p>'+e(p.finalCta?.subheadline||'')+'</p>'+cta(page,p.finalCta?.cta)+'<div class="ml-trust">'+list(p.finalCta?.trust,x=>'<span>✓ '+e(x)+'</span>')+'</div></div></section>');

  if(on(p,'footer'))s.push('<footer class="ml-footer"><div class="ml-shell"><strong>'+e(p.footer?.company||page.name)+'</strong><span>'+e(p.footer?.contact||'')+'</span><nav>'+list(p.footer?.links,x=>'<a href="'+e(x.href||'#')+'">'+e(x.label||'')+'</a>')+'</nav></div></footer>');

  const sticky=settings.stickyCta?'<div class="ml-sticky">'+cta(page)+'</div>':'';
  return '<style>:root{--ml-accent:'+e(accent)+'}</style><main class="ml-page">'+s.join('')+'</main>'+sticky;
}

export function renderLandingAdmin(page){
  const payload=JSON.stringify(page?.payload||{},null,2);
  return '<div class="admin-toolbar"><div><h1 style="margin:0;color:var(--navy)">Landing Pages</h1><p style="color:var(--muted)">Conteúdo integral controlado pelo Supabase.</p></div><a class="btn btn-secondary" href="/'+e(page.slug)+'/" target="_blank">Abrir página</a></div>'+
  '<form id="landingEditorForm" class="card info-block"><div class="editor-grid">'+
  '<div class="field"><label>Nome interno</label><input class="input" name="landing.name" value="'+e(page.name)+'"></div>'+
  '<div class="field"><label>Slug</label><input class="input" name="landing.slug" value="'+e(page.slug)+'"></div>'+
  '<div class="field"><label>Status</label><select class="select" name="landing.isActive"><option value="true" '+(page.isActive?'selected':'')+'>Ativa</option><option value="false" '+(!page.isActive?'selected':'')+'>Inativa</option></select></div>'+
  '<div class="field"><label>Indexação</label><select class="select" name="landing.isIndexable"><option value="false" '+(!page.isIndexable?'selected':'')+'>Noindex / prévia</option><option value="true" '+(page.isIndexable?'selected':'')+'>Indexável</option></select></div>'+
  '<div class="field full"><label>Conteúdo completo da landing</label><textarea class="textarea" style="min-height:640px;font-family:ui-monospace,monospace;font-size:12px" name="landing.payload">'+e(payload)+'</textarea><small>Todos os textos, CTAs, cards, valores, imagens, FAQ e configurações da página estão aqui. Nada da copy fica preso no HTML.</small></div>'+
  '</div><div class="completion"><strong>100% editável:</strong> altere qualquer item no JSON e salve. O próximo refinamento pode transformar cada seção em campos visuais sem mudar a estrutura de dados.</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" id="saveLandingPage" type="button">Salvar landing</button></div></form>';
}

export function collectLandingEditor(form,page,slugify){
  const base=structuredClone(page), fd=new FormData(form);
  base.name=String(fd.get('landing.name')||'').trim();
  base.slug=slugify(String(fd.get('landing.slug')||base.name));
  base.isActive=String(fd.get('landing.isActive'))==='true';
  base.isIndexable=String(fd.get('landing.isIndexable'))==='true';
  try{base.payload=JSON.parse(String(fd.get('landing.payload')||'{}'))}catch{throw new Error('JSON da landing inválido')}
  return base;
}
