import {DEFAULT_PRODUCTS, SECTION_KEYS, normalizeProduct} from './data.js';
import {getAuthState,onAuthChange,signInAdmin,signOutAdmin,updateAdminPassword,loadCloudProducts,upsertCloudProduct,replaceCloudProducts,loadOrderBumps,upsertOrderBump,recordOrderBumpEvent,loadOrderBumpEvents} from './supabase.js';
import {createCheckoutPayment} from './payment-adapter.js';

const app = document.querySelector('#app');
const DB_KEY='gp_global_pharma_products_empty_v1';
const CART_KEY='gp_global_pharma_cart_empty_v1';
const BUMP_SELECTION_KEY='gp_global_pharma_order_bumps_v1';
const CHECKOUT_SESSION_KEY='gp_global_pharma_checkout_session_v1';
const loadBumpSelections=()=>{try{return JSON.parse(localStorage.getItem(BUMP_SELECTION_KEY)||'[]')}catch{return[]}};
const checkoutSessionId=(()=>{let id=localStorage.getItem(CHECKOUT_SESSION_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(CHECKOUT_SESSION_KEY,id)}return id})();
const state={products:loadProducts(),cart:loadCart(),cartOpen:false,adminEditing:null,adminTab:'geral',selectedShipping:'basic',galleryIndex:0,heroIndex:0,authUser:null,isAdmin:false,mustChangePassword:false,cloudReady:false,orderBumps:[],orderBumpEditing:null,orderBumpEvents:[],selectedBumpIds:loadBumpSelections(),checkoutSessionId,checkoutPaymentMethod:'pix'};
let heroTimer=null;
let headerScrollHandler=null;

function loadProducts(){
  try{const raw=localStorage.getItem(DB_KEY);if(raw)return JSON.parse(raw).map(normalizeProduct)}catch{}
  const seeded=DEFAULT_PRODUCTS.map(normalizeProduct);localStorage.setItem(DB_KEY,JSON.stringify(seeded));return seeded;
}
function saveProducts(){localStorage.setItem(DB_KEY,JSON.stringify(state.products));}
async function refreshCloudProducts(){
  try{
    const cloud=await loadCloudProducts(state.isAdmin);
    state.products=cloud.map(normalizeProduct);
    saveProducts();
    state.cloudReady=true;
    return true;
  }catch(err){
    console.error('Falha ao sincronizar catálogo com Supabase',err);
    state.cloudReady=true;
    return false;
  }
}
async function refreshOrderBumps(){
  try{
    state.orderBumps=await loadOrderBumps(state.isAdmin&&!state.mustChangePassword);
    return true;
  }catch(err){
    console.error('Falha ao sincronizar order bumps',err);
    state.orderBumps=[];
    return false;
  }
}
async function refreshOrderBumpMetrics(){
  if(!state.isAdmin||state.mustChangePassword){state.orderBumpEvents=[];return false}
  try{
    state.orderBumpEvents=await loadOrderBumpEvents();
    return true;
  }catch(err){
    console.error('Falha ao carregar métricas de order bump',err);
    state.orderBumpEvents=[];
    return false;
  }
}
function saveBumpSelections(){localStorage.setItem(BUMP_SELECTION_KEY,JSON.stringify(state.selectedBumpIds))}
function eligibleOrderBumps(items){
  const productIds=new Set(items.map(x=>x.p?.id).filter(Boolean));
  return state.orderBumps.filter(b=>b.isActive && (!b.triggerProductId || productIds.has(b.triggerProductId)));
}
async function refreshAuth(){
  try{
    const auth=await getAuthState();
    state.authUser=auth.user;
    state.isAdmin=auth.isAdmin;
    state.mustChangePassword=auth.mustChangePassword;
  }catch(err){
    console.error('Falha ao verificar autenticação',err);
    state.authUser=null;
    state.isAdmin=false;
  }
}
function loadCart(){try{return JSON.parse(localStorage.getItem(CART_KEY)||'[]')}catch{return[]}}
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(state.cart));}
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const isVisible=(p,k)=>p.sectionVisibility?.[k]!==false;
const has=(v)=>typeof v==='string'?v.trim().length>0:Array.isArray(v)?v.length>0:!!v;
const hasDocumentation=p=>Boolean(p.documentation||p.documents?.length||p.officialDocumentUrl);
function uid(){return crypto.randomUUID()}
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)}
function goto(path){history.pushState({},'',path);state.galleryIndex=0;state.cartOpen=false;render();const hash=path.includes('#')?path.split('#')[1]:'';if(hash){requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({behavior:'smooth',block:'start'}))}else{window.scrollTo({top:0,behavior:'smooth'})}}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}
window.addEventListener('popstate',render);
document.addEventListener('click',e=>{const a=e.target.closest('[data-route]');if(a){e.preventDefault();goto(a.getAttribute('href'))}})

const icons={
 search:`<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`,
 user:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>`,
 heart:`<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"></path></svg>`,
 cart:`<svg viewBox="0 0 24 24"><path d="M3 3h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 7H6"></path><circle cx="10" cy="20" r="1.4"></circle><circle cx="18" cy="20" r="1.4"></circle></svg>`,
 menu:`<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>`,
 x:`<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg>`,
 minus:`<svg viewBox="0 0 24 24"><path d="M5 12h14"></path></svg>`,
 plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>`,
 trash:`<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M8 11v6M12 11v6M16 11v6M6 7l1 14h10l1-14"></path></svg>`,
 shield:`<svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3 7.9 7.5 9.5 4.5-1.6 7.5-4.9 7.5-9.5V6L12 3Z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
 file:`<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h5M9 13h6M9 17h6"></path></svg>`,
 snow:`<svg viewBox="0 0 24 24"><path d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11M7 4l5 3 5-3M7 20l5-3 5 3M3 12l4-3v6M21 12l-4-3v6"></path></svg>`,
 truck:`<svg viewBox="0 0 24 24"><path d="M3 5h11v11H3zM14 9h4l3 3v4h-7z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>`
};
function svg(name){return `<span aria-hidden>${icons[name]||''}</span>`}
function cartCount(){return state.cart.reduce((a,i)=>a+i.qty,0)}
function logo(light=false){return `<a href="/" data-route class="brand" aria-label="Global Pharma, ir para a home"><img src="/assets/global-pharma-icon.png" alt="Global Pharma" width="40" height="40"><span class="brand-text"><strong class="${light?'light':''}">Global Pharma</strong><small class="${light?'light':''}">Distribuidora farmacêutica</small></span></a>`}
function headerSearchBox(id,mobile=false){return `<div class="${mobile?'mobile-search':'search-wrap'}" data-search-box><form class="header-search-form" role="search" autocomplete="off"><span class="search-icon">${icons.search}</span><input id="${id}" type="search" placeholder="Buscar produtos..." aria-label="Buscar produtos" aria-autocomplete="list" aria-expanded="false" autocomplete="off"><div class="search-dropdown" id="${id}-results" role="listbox" hidden></div></form></div>`}
function header(){const path=location.pathname;const nav=[['Produtos','/produtos'],['Entrega Expressa','/entrega'],['Transparência','/transparencia'],['Quem Somos','/#nossa-historia']];const isActive=h=>!h.includes('#')&&path.startsWith(h);return `<header class="header" id="siteHeader"><div class="announcement"><div class="container announcement-inner"><p>Procedência <b>•</b> Atendimento especializado <b>•</b> Envio seguro</p></div></div><div class="header-surface" id="headerSurface"><div class="container"><div class="header-main">${logo()}<nav class="nav" aria-label="Principal">${nav.map(([l,h])=>`<a class="${isActive(h)?'active':''}" href="${h}" data-route ${isActive(h)?'aria-current="page"':''}>${l}</a>`).join('')}</nav><div class="header-actions">${headerSearchBox('headerSearch')}<button class="icon-btn" type="button" aria-label="Minha conta">${icons.user}</button><button class="icon-btn" type="button" aria-label="Favoritos">${icons.heart}</button><button class="icon-btn" type="button" id="cartOpen" aria-label="Carrinho${cartCount()?`, ${cartCount()} itens`:', vazio'}">${icons.cart}${cartCount()?`<span class="cart-badge">${cartCount()}</span>`:''}</button><button class="icon-btn mobile-toggle" type="button" id="mobileToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileMenu"><span class="menu-open-icon">${icons.menu}</span><span class="menu-close-icon">${icons.x}</span></button></div></div>${headerSearchBox('mobileHeaderSearch',true)}<div class="mobile-menu" id="mobileMenu"><nav aria-label="Menu mobile"><ul>${nav.map(([l,h])=>`<li><a class="${isActive(h)?'active':''}" href="${h}" data-route ${isActive(h)?'aria-current="page"':''}>${l}</a></li>`).join('')}</ul></nav></div></div></div></header>`}
function cartDrawer(){const lines=state.cart.map((item,index)=>({item,index,p:state.products.find(p=>p.slug===item.slug)})).filter(x=>x.p);const subtotal=lines.reduce((sum,{item,p})=>sum+((item.shipping==='express'&&p.expressAvailable?p.pricing.express:p.pricing.basic)*item.qty),0);return `<div class="cart-overlay ${state.cartOpen?'open':''}" id="cartOverlay" aria-hidden="${state.cartOpen?'false':'true'}"><button class="cart-backdrop" id="cartBackdrop" aria-label="Fechar carrinho"></button><aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Seu carrinho"><div class="cart-drawer-head"><div><strong>Seu carrinho</strong><small>${cartCount()} ${cartCount()===1?'item':'itens'}</small></div><button class="cart-close" id="cartClose" type="button" aria-label="Fechar carrinho">${icons.x}</button></div>${lines.length?`<div class="cart-lines">${lines.map(({item,index,p})=>{const unit=item.shipping==='express'&&p.expressAvailable?p.pricing.express:p.pricing.basic;const img=p.media?.find(m=>m.src)?.src;return `<div class="cart-line">${img?`<img class="cart-thumb" src="${esc(img)}" alt="${esc(p.displayName)}">`:`<div class="cart-thumb placeholder">▧</div>`}<div class="cart-line-copy"><strong>${esc(p.displayName)}</strong><small class="cart-delivery">${item.shipping==='express'?'Entrega expressa':'Entrega básica'}</small><small>${money(unit)} / un.</small><div class="cart-line-bottom"><div class="qty-control"><button type="button" data-cart-dec="${index}" aria-label="Diminuir quantidade">${icons.minus}</button><span>${item.qty}</span><button type="button" data-cart-inc="${index}" aria-label="Aumentar quantidade">${icons.plus}</button></div><b>${money(unit*item.qty)}</b></div></div><button class="cart-remove" type="button" data-cart-remove="${index}" aria-label="Remover produto">${icons.trash}</button></div>`}).join('')}</div><div class="cart-drawer-foot"><div class="cart-subtotal"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><p>Entrega conforme a modalidade selecionada em cada item.</p><a class="btn btn-primary btn-lg" href="/checkout" data-route>IR PARA O CHECKOUT</a><button class="cart-continue" id="cartContinue" type="button">Continuar comprando</button></div>`:`<div class="cart-empty"><strong>Seu carrinho está vazio</strong><p>Adicione produtos para continuar.</p><a class="btn btn-primary btn-sm" href="/produtos" data-route>VER PRODUTOS</a></div>`}</aside></div>`}

function footer(){const cols=[['Global Pharma',[['Quem Somos','/#nossa-historia'],['Nossa História','/#nossa-historia'],['Contato','/contato']]],['Produtos',[['Todos os produtos','/produtos'],['Transparência','/transparencia'],['Entrega','/entrega'],['Rastreamento','/rastreamento']]],['Atendimento',[['Central de Ajuda','/ajuda'],['FAQ','/#faq'],['Fale Conosco','/contato'],['Rastreamento','/rastreamento']]],['Transparência',[['Central de Transparência','/transparencia'],['Marcas e laudos','/transparencia'],['Entrega e logística','/entrega'],['Antifraude','/transparencia']]],['Institucional',[['Política de Privacidade','/privacidade'],['Termos de Uso','/termos'],['Política de Trocas','/trocas-e-devolucoes'],['Política de Entrega','/entrega']]]];return `<footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-brand">${logo(true)}<p>Distribuição farmacêutica com procedência, rastreabilidade, cuidado logístico e entrega expressa.</p><div style="display:flex;gap:8px"><a class="icon-btn" style="color:#fff;border:1px solid rgba(255,255,255,.14)" href="/contato" data-route>◎</a><a class="icon-btn" style="color:#fff;border:1px solid rgba(255,255,255,.14)" href="/contato" data-route>◌</a></div></div><div class="footer-cols">${cols.map(([t,links])=>`<div class="footer-col"><h4>${t}</h4>${links.map(([l,h])=>`<a href="${h}" data-route>${l}</a>`).join('')}</div>`).join('')}</div></div><div class="footer-meta"><div><p style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.55);font-weight:800">Meios de pagamento</p><div class="payments"><span>Cartão</span><span>Pix</span><span>Boleto</span><span>Parcelado</span></div></div><div><p style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.55);font-weight:800">Segurança</p><div class="payments"><span>🔒 Ambiente de compra protegido</span></div></div></div><div class="footer-bottom"><span>© 2026 Global Pharma. Todos os direitos reservados.</span><span>As informações deste site têm caráter informativo e não substituem a orientação de um profissional de saúde.</span></div></div></footer>`}
function shell(content){return header()+content+footer()+cartDrawer()}

function docPill(p){return `<span class="doc-pill">${hasDocumentation(p)?'Docs':'Docs em atualização'}</span>`}
function productCard(p){const img=p.media?.find(m=>m.src)?.src;const presentation=p.presentationFromUser||[p.concentration,p.format].filter(has).join(' • ')||'Apresentação conforme rótulo';return `<article class="product-card"><a href="/produto/${esc(p.slug)}" data-route class="product-media">${img?`<img src="${esc(img)}" alt="${esc(p.displayName)}">`:`<div class="product-placeholder">▧</div>`}${docPill(p)}</a><div class="product-body"><h3><a href="/produto/${esc(p.slug)}" data-route>${esc(p.name)}</a></h3><div class="product-meta">${esc(presentation)}</div><div class="product-price-row"><div><div class="price-kicker">A partir de</div><div class="price">${money(p.promoPriceCents?p.promoPriceCents/100:p.pricing.basic)}</div>${p.expressAvailable?`<div class="express-price">Expressa ${money(p.pricing.express)}</div>`:''}</div><button class="cart-mini" data-add="${esc(p.slug)}" aria-label="Adicionar ao carrinho">🛒</button></div><div class="product-cta"><a class="btn btn-primary" href="/produto/${esc(p.slug)}" data-route>VER PRODUTO</a><button class="cart-mini" data-add="${esc(p.slug)}">🛒</button></div></div></article>`}

function brandMarquee(){
 const brands=[...new Set(state.products.filter(p=>p.isActive&&has(p.brand)).map(p=>p.brand.trim()))];
 if(!brands.length)return '';
 const items=[...brands,...brands];
 return `<section class="brands"><div class="container"><div class="brands-label">Marcas presentes no catálogo</div></div><div class="brand-marquee"><div class="brand-track">${items.map(n=>`<div class="brand-tile brand-tile-text"><strong>${esc(n)}</strong></div>`).join('')}</div></div></section>`;
}
function hero(){const slides=[
 {cls:'',ey:'Global Pharma',title:'Saúde, qualidade e procedência.',text:'Produtos selecionados, informação clara, atendimento especializado e uma experiência de compra segura.',img:'/assets/global-pharma-logo-transparent.png',cta:'VER PRODUTOS',href:'/produtos'},
 {cls:'deep',ey:'Entrega expressa',title:'Comprou hoje. Recebe hoje.',text:'Para regiões elegíveis, com cuidado logístico e acompanhamento do pedido.',icon:'truck',cta:'CONSULTAR ENTREGA',href:'/entrega'},
 {cls:'',ey:'Transparência',title:'Você não precisa apenas confiar. Pode verificar.',text:'Procedência, documentação disponível e fontes organizadas por produto.',icon:'shield',cta:'VER TRANSPARÊNCIA',href:'/transparencia'}
];return `<section class="hero-shell"><div class="container"><div class="hero-viewport"><div class="hero-track" style="transform:translateX(-${state.heroIndex*100}%)">${slides.map(s=>`<article class="hero-slide ${s.cls}"><div class="hero-copy"><span class="badge">${s.ey}</span><h1>${s.title}</h1><p>${s.text}</p><a class="btn btn-primary" href="${s.href}" data-route style="margin-top:18px">${s.cta}</a></div><div class="hero-art">${s.img?`<img src="${s.img}" alt="">`:`<div class="hero-art-icon">${icons[s.icon]||''}</div>`}</div></article>`).join('')}</div><button class="hero-arrow prev" data-hero="prev">‹</button><button class="hero-arrow next" data-hero="next">›</button></div><div class="hero-dots">${slides.map((_,i)=>`<button class="hero-dot ${state.heroIndex===i?'active':''}" data-hero-index="${i}" aria-label="Banner ${i+1}"></button>`).join('')}</div></div></section>`}
function quickBenefits(){return `<section class="home-section ice"><div class="container"><div class="section-head"><div><h2>Por que comprar na Global Pharma</h2></div></div><div class="quick-grid"><div class="quick-card"><div class="quick-icon">⌁</div><strong>Procedência</strong><span>Informações organizadas</span></div><div class="quick-card"><div class="quick-icon">▤</div><strong>Documentação</strong><span>Consulta quando disponível</span></div><div class="quick-card"><div class="quick-icon">❄</div><strong>Conservação</strong><span>Cuidado logístico</span></div><div class="quick-card"><div class="quick-icon">⚡</div><strong>Entrega expressa</strong><span>Regiões elegíveis</span></div></div></div></section>`}
function socialProof(){return `<section class="home-section"><div class="container"><div class="social-card-wrap"><div class="section-head"><div><span class="pdp-kicker">Experiência real</span><h2>Quem compra, mostra.</h2><p>Depoimentos, recebimentos e conteúdo de parceiros organizados em um só lugar.</p></div><span class="badge">@globalpharma</span></div><div class="social-grid"><div class="social-item"><div class="social-thumb">▶</div><strong>Depoimento em vídeo</strong><span>Conteúdo em breve</span></div><div class="social-item"><div class="social-thumb">▧</div><strong>Recebimento real</strong><span>Conteúdo em breve</span></div><div class="social-item"><div class="social-thumb">✦</div><strong>Conteúdo de parceiro</strong><span>Conteúdo em breve</span></div></div><div class="trust-row"><span>▣ Depoimentos reais</span><span>✓ Influenciadores parceiros</span><span>✦ Conteúdo diário</span></div></div></div></section>`}
function expressCompact(){return `<section class="home-section"><div class="container"><div class="express-box"><div class="express-box-inner"><div><div class="pdp-kicker">Entrega expressa</div><h2 style="font-size:32px;margin-top:4px">Seu pedido chega rápido</h2></div><div class="delivery-two"><div class="delivery-mini"><span>São Paulo Capital</span><strong>MESMO DIA*</strong></div><div class="delivery-mini"><span>Outras localidades elegíveis</span><strong>ATÉ 48H*</strong></div></div></div><div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:12px"><a href="/entrega" data-route class="btn btn-primary btn-sm">CONSULTAR ENTREGA</a><span style="font-size:10px;color:var(--slate-500)">*Prazo sujeito a CEP, horário do pedido, aprovação do pagamento, estoque e condições logísticas.</span></div></div></div></section>`}
function transparencyCompact(){return `<section class="home-section ice"><div class="container"><div class="section-head"><div><h2>Você não precisa apenas confiar. Pode verificar.</h2></div></div><div class="trans-grid"><div class="trans-card"><strong>Procedência</strong><p>Origem e cadeia de fornecimento quando informadas.</p></div><div class="trans-card"><strong>Documentação</strong><p>Documentos disponíveis por produto e lote.</p></div><div class="trans-card"><strong>Fontes</strong><p>Canais oficiais dos fabricantes e órgãos competentes.</p></div></div><a href="/transparencia" data-route class="btn btn-secondary btn-sm" style="margin-top:12px">VER CENTRAL DE TRANSPARÊNCIA</a></div></section>`}
function shippingStory(){const steps=[['Separação cuidadosa','Conferência inicial dos itens antes do preparo.'],['Conferência final','Revisão do pedido antes da embalagem.'],['Proteção térmica','Acondicionamento adequado para o transporte.'],['Pronto para envio','Pedido preparado para seguir até o destino.']];return `<section id="nossa-historia" class="home-section ice"><div class="container"><div class="section-head"><div><span class="pdp-kicker">Cuidado em cada etapa</span><h2>Seu pedido passa por um cuidado que você consegue ver.</h2><p>Da separação ao envio, mostramos como cada pedido é preparado com atenção e conservação.</p></div></div><div class="story-grid">${steps.map((s,i)=>`<div class="story-card"><span class="story-num">Etapa ${i+1}</span><div class="story-copy"><strong>${s[0]}</strong><span>${s[1]}</span></div></div>`).join('')}</div></div></section>`}
function faqCompact(){const faqs=[['Como funciona o envio?','As modalidades e prazos disponíveis aparecem no produto e no checkout.'],['Como consultar informações sobre um produto?','Abra a página do produto para ver somente as informações cadastradas e disponíveis.'],['Como acompanho meu pedido?','Use a página de rastreamento com os dados do seu pedido.'],['Como funciona o atendimento?','O atendimento acompanha dúvidas antes, durante e depois da compra.']];return `<section id="faq" class="home-section ice"><div class="container"><div class="section-head"><div><h2>Dúvidas frequentes</h2></div></div><div class="faq">${faqs.map(([q,a])=>`<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div><a href="/rastreamento" data-route class="section-link" style="display:inline-block;margin-top:12px">Acompanhar um pedido →</a></div></section>`}
function home(){const products=state.products.filter(p=>p.isActive).sort((a,b)=>a.sortOrder-b.sortOrder);return shell(`<main>${hero()}${brandMarquee()}<section class="home-section"><div class="container"><div class="section-head"><div><h2>Todos os nossos produtos</h2><p>${products.length} produtos</p></div><a href="/produtos" data-route class="section-link">Ver catálogo completo →</a></div><div class="home-search"><input id="homeProductSearch" placeholder="Buscar produto..."></div><div id="homeProductGrid" class="grid-products">${products.length?products.map(productCard).join(''):'<div class="empty empty-products"><strong>Nenhum produto cadastrado</strong><p>Cadastre o primeiro produto pelo painel administrativo.</p><a href="/admin/produtos" data-route class="btn btn-primary btn-sm">CADASTRAR PRODUTO</a></div>'}</div></div></section>${socialProof()}${quickBenefits()}${expressCompact()}${transparencyCompact()}${shippingStory()}${faqCompact()}</main>`)}

function productsPage(){const active=state.products.filter(p=>p.isActive).sort((a,b)=>a.sortOrder-b.sortOrder);return shell(`<main><section class="page-hero"><div class="container"><span class="pdp-kicker">Catálogo</span><h1>Produtos</h1><p>Explore o catálogo da Global Pharma e acesse as informações disponíveis de cada item.</p></div></section><div class="catalog-toolbar" id="catalogToolbar"><div class="container"><div class="catalog-tools"><input id="catalogSearch" class="input" placeholder="Buscar por produto, marca ou apresentação..."><div class="catalog-tools-row"><button class="filter-chip">Todos</button><button class="filter-chip">Documentação disponível</button><button class="filter-chip">Até R$ 900</button><button class="filter-chip">R$ 900 – R$ 1.500</button><button class="filter-chip">Acima de R$ 1.500</button></div></div></div></div><section class="catalog-section"><div class="container"><div class="catalog-count">${active.length} produtos encontrados</div><div id="catalogGrid" class="grid-products">${active.length?active.map(productCard).join(''):'<div class="empty empty-products"><strong>Nenhum produto cadastrado</strong><p>O catálogo será preenchido pelo painel administrativo.</p></div>'}</div></div></section></main>`)}

function findProduct(slug){return state.products.find(p=>p.slug===slug&&p.isActive)}
function pdp(slug){const p=findProduct(slug);if(!p)return shell(`<main class="section"><div class="container"><div class="empty"><h2>Produto não encontrado</h2><a href="/produtos" data-route class="btn btn-primary">Ver produtos</a></div></div></main>`);
 const c=p.pdpContent||{};const media=(p.media||[]).filter(m=>m&&m.src);const current=media[state.galleryIndex]||media[0];
 const chips=[];if(p.regulatory?.authority&&p.regulatory?.registration&&isVisible(p,'regulatory'))chips.push(`${p.regulatory.authority} ${p.regulatory.registration}`);if(hasDocumentation(p)&&isVisible(p,'documentation'))chips.push(c.chipDocumentation||'Documentação disponível');if((p.storage||p.deliveryStorageNote||p.temperatureRange)&&isVisible(p,'delivery'))chips.push(c.chipConservation||'Conservação informada');
 const specs=[['Princípio ativo',p.activeIngredient],['Concentração',p.concentration||p.dosageFromUser],['Apresentação',p.presentationFromUser],['Variante',p.variantFromUser],['Formato',p.format],['Via de administração',p.administration],['Origem',p.origin],['Conservação',p.storage],['Temperatura',p.temperatureRange],['Fabricante',p.regulatory?.manufacturer]].filter(([,v])=>has(v));
 const deliveryHas=Boolean(has(p.basicEta)||has(p.expressEta)||p.shippingFeeCents!=null||has(p.deliveryStorageNote)||has(p.temperatureRange));
 const safetyHas=Boolean(has(p.storage)||has(p.freezeWarning)||has(p.lightWarning)||has(p.mainContraindication)||has(p.childrenWarning)||p.importantWarnings?.length||p.safety);
 const regHas=Boolean((p.regulatory&&Object.values(p.regulatory).some(v=>has(v)))||has(p.regulatoryNotes)||has(p.officialDocumentUrl));
 const docsHas=Boolean(p.documentation||p.documents?.length);const sourceHas=Boolean(has(p.sourcesIntro)||has(p.sourcesNote)||p.sourceLinks?.some(s=>has(s.url)));
 const related=state.products.filter(x=>x.isActive&&x.slug!==p.slug&&(x.category===p.category||x.brand===p.brand)).slice(0,4);
 const option=state.selectedShipping==='express'&&p.expressAvailable?'express':'basic';const price=option==='express'?p.pricing.express:(p.promoPriceCents?p.promoPriceCents/100:p.pricing.basic);
 const shippingCards=`<div class="shipping-options"><label class="shipping-opt ${option==='basic'?'selected':''}"><div><input type="radio" name="ship" data-shipping="basic" ${option==='basic'?'checked':''}><strong>${esc(c.basicDeliveryLabel||'Entrega Básica')}</strong><div class="ship-price">${money(p.promoPriceCents?p.promoPriceCents/100:p.pricing.basic)}</div>${p.basicEta?`<small>${esc(p.basicEta)}</small>`:''}</div></label>${p.expressAvailable?`<label class="shipping-opt ${option==='express'?'selected':''}"><div><input type="radio" name="ship" data-shipping="express" ${option==='express'?'checked':''}><strong>${esc(c.expressDeliveryLabel||'Entrega Expressa')}</strong><div class="ship-price">${money(p.pricing.express)}</div>${p.expressEta?`<small>${esc(p.expressEta)}</small>`:''}</div></label>`:''}</div>`;
 const trust=[];if(regHas&&isVisible(p,'regulatory'))trust.push(c.trustOrigin||'Procedência');if(docsHas&&isVisible(p,'documentation'))trust.push(c.trustDocumentation||'Documentação');if(deliveryHas&&isVisible(p,'delivery'))trust.push(c.trustDelivery||'Entrega');if(safetyHas&&isVisible(p,'safety'))trust.push(c.trustConservation||'Conservação');
 return shell(`<main class="pdp"><div class="container"><div class="breadcrumbs"><a href="/" data-route>Início</a> / <a href="/produtos" data-route>Produtos</a> / ${esc(p.displayName)}</div><div class="pdp-grid"><div><div class="gallery-main">${current?`<img src="${esc(current.src)}" alt="${esc(current.alt||p.displayName)}">`:`<div class="product-placeholder">▧</div>`}</div>${media.length>1?`<div class="thumbs">${media.map((m,i)=>`<button class="thumb ${i===state.galleryIndex?'active':''}" data-thumb="${i}"><img src="${esc(m.src)}" alt="${esc(m.alt||'')}"></button>`).join('')}</div>`:''}</div><div><div class="pdp-kicker">${esc(p.category||p.brand||c.categoryFallback||'Produto')}</div><h1>${esc(p.displayName)}</h1>${p.presentationFromUser?`<p class="pdp-sub">${esc(p.presentationFromUser)}</p>`:''}${p.shortDescription?`<p class="pdp-sub">${esc(p.shortDescription)}</p>`:''}${chips.length?`<div class="chips">${chips.map(c=>`<span class="chip">${esc(c)}</span>`).join('')}</div>`:''}${shippingCards}<div class="pdp-actions"><button class="btn btn-primary btn-lg" data-buy="${esc(p.slug)}">🔒 ${esc(c.buyNowLabel||'COMPRAR AGORA')}</button><button class="btn btn-secondary" data-add="${esc(p.slug)}">${esc(c.addToCartLabel||'Adicionar ao carrinho')}</button></div>${trust.length?`<div class="trust-strip">${trust.map(t=>`<div>✓ ${esc(t)}</div>`).join('')}</div>`:''}</div></div>
 ${isVisible(p,'description')&&(p.fullDescription||p.brandDescription||p.officialBrandUrl)?`<section class="pdp-section"><h2>${esc(c.aboutTitle||'Sobre o produto')}</h2><div class="desc-grid">${p.fullDescription?`<div><p class="pdp-sub">${esc(p.fullDescription)}</p></div>`:''}${p.brandDescription||p.officialBrandUrl?`<aside class="brand-box"><small>${p.brand?`Sobre ${esc(p.brand)}`:'Sobre a marca'}</small>${p.brandDescription?`<p>${esc(p.brandDescription)}</p>`:''}${p.officialBrandUrl?`<a href="${esc(p.officialBrandUrl)}" target="_blank" class="section-link">Site oficial da marca →</a>`:''}</aside>`:''}</div></section>`:''}
 ${isVisible(p,'specs')&&specs.length?`<section class="pdp-section"><h2>${esc(c.specsTitle||'Ficha técnica')}</h2><div class="spec-table">${specs.map(([l,v])=>`<div class="spec"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('')}</div></section>`:''}
 ${isVisible(p,'delivery')&&deliveryHas?`<section class="pdp-section"><h2>${esc(c.deliveryTitle||'Entrega e conservação')}</h2><div class="accordion-block">${p.basicEta?`<details open><summary>Entrega básica</summary><p>${esc(p.basicEta)}</p></details>`:''}${p.expressAvailable&&p.expressEta?`<details><summary>Entrega expressa</summary><p>${esc(p.expressEta)}</p></details>`:''}${p.deliveryStorageNote?`<details><summary>Conservação durante a entrega</summary><p>${esc(p.deliveryStorageNote)}</p></details>`:''}</div></section>`:''}
 ${isVisible(p,'safety')&&safetyHas?`<section class="pdp-section"><h2>${esc(c.safetyTitle||'Segurança e conservação')}</h2><div class="accordion-block">${p.storage?`<details open><summary>Armazenamento</summary><p>${esc(p.storage)}</p></details>`:''}${p.freezeWarning?`<details><summary>Congelamento</summary><p>${esc(p.freezeWarning)}</p></details>`:''}${p.lightWarning?`<details><summary>Exposição à luz</summary><p>${esc(p.lightWarning)}</p></details>`:''}${p.mainContraindication?`<details><summary>Contraindicação</summary><p>${esc(p.mainContraindication)}</p></details>`:''}${p.importantWarnings?.length?`<details><summary>Informações importantes</summary><ul>${p.importantWarnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`:''}</div></section>`:''}
 ${isVisible(p,'regulatory')&&regHas?`<section class="pdp-section"><h2>${esc(c.regulatoryTitle||'Regulamentação')}</h2><div class="spec-table">${p.regulatory?.authority?`<div class="spec"><span>Órgão</span><strong>${esc(p.regulatory.authority)}</strong></div>`:''}${p.regulatory?.registration?`<div class="spec"><span>Registro</span><strong>${esc(p.regulatory.registration)}</strong></div>`:''}${p.regulatory?.manufacturer?`<div class="spec"><span>Fabricante</span><strong>${esc(p.regulatory.manufacturer)}</strong></div>`:''}${p.regulatory?.origin?`<div class="spec"><span>Origem</span><strong>${esc(p.regulatory.origin)}</strong></div>`:''}</div>${p.regulatoryNotes?`<p class="pdp-sub" style="margin-top:12px">${esc(p.regulatoryNotes)}</p>`:''}${p.officialDocumentUrl?`<a class="btn btn-secondary btn-sm" target="_blank" href="${esc(p.officialDocumentUrl)}" style="margin-top:12px">DOCUMENTO OFICIAL ↗</a>`:''}</section>`:''}
 ${isVisible(p,'documentation')&&docsHas?`<section class="pdp-section"><h2>${esc(c.documentationTitle||'Documentação')}</h2>${p.documentation?.headline?`<h3>${esc(p.documentation.headline)}</h3>`:''}${p.documentation?.summary?`<p class="pdp-sub">${esc(p.documentation.summary)}</p>`:''}${p.documents?.length?`<div class="accordion-block">${p.documents.map(d=>`<details><summary>${esc(d.documentType||'Documento')}</summary>${d.origin?`<p>${esc(d.origin)}</p>`:''}${d.pdfUrl?`<a class="section-link" href="${esc(d.pdfUrl)}" target="_blank">Abrir documento →</a>`:''}</details>`).join('')}</div>`:''}</section>`:''}
 ${isVisible(p,'sources')&&sourceHas?`<section class="pdp-section"><h2>${esc(c.sourcesTitle||'Fontes')}</h2>${p.sourcesIntro?`<p class="pdp-sub">${esc(p.sourcesIntro)}</p>`:''}<div class="accordion-block">${(p.sourceLinks||[]).filter(s=>has(s.url)).map(s=>`<details><summary>${esc(s.label||'Fonte')}</summary><a class="section-link" href="${esc(s.url)}" target="_blank">${esc(s.buttonLabel||'Acessar fonte')} →</a></details>`).join('')}</div></section>`:''}
 ${isVisible(p,'faq')&&p.faqs?.length?`<section class="pdp-section"><h2>${esc(c.faqTitle||'Perguntas frequentes')}</h2><div class="faq" style="columns:1">${p.faqs.map(f=>`<details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>`:''}
 ${isVisible(p,'reviews')&&p.reviews?.length?`<section class="pdp-section"><h2>${esc(c.reviewsTitle||'Experiência de compra')}</h2><div class="social-grid">${p.reviews.slice(0,3).map(r=>`<div class="social-item card" style="padding:14px"><strong>${esc(r.author)}</strong><span>${esc(r.topic||'')}</span><p class="pdp-sub">${esc(r.text)}</p></div>`).join('')}</div></section>`:''}
 ${isVisible(p,'related')&&related.length?`<section class="pdp-section"><h2>${esc(c.relatedTitle||'Também disponíveis')}</h2><div class="related-grid">${related.map(productCard).join('')}</div></section>`:''}</div><div class="sticky-buy"><div><div class="price-kicker">A partir de</div><strong>${money(price)}</strong></div><button class="btn btn-primary" data-buy="${esc(p.slug)}">COMPRAR AGORA</button></div></main>`)}

function expressDeliveryPage(){
 const filmingSteps=[
  ['Mostre a caixa ainda fechada.','Filme todos os lados, incluindo a parte de cima e a parte de baixo.'],
  ['Registre a etiqueta e os lacres.','Deixe visíveis a identificação da encomenda, as fitas e eventuais sinais de dano ou violação.'],
  ['Abra a caixa sem interromper a gravação.','Mantenha a embalagem no enquadramento durante a abertura.'],
  ['Mostre todo o conteúdo recebido.','Registre os itens, as quantidades e o estado das embalagens, sem romper os lacres dos produtos.'],
  ['Aproxime a câmera de qualquer problema.','Mostre claramente danos, vazamentos, itens divergentes ou outros sinais que precisem de conferência.'],
  ['Guarde o arquivo original.','Se precisar de atendimento, encaminhe o vídeo sem cortes ou edições pelo nosso canal oficial.']
 ];
 const deadlines=[
  ['Postagem após a confirmação do pagamento','Até 1 dia útil após a confirmação do pagamento, para produtos disponíveis em estoque.'],
  ['Disponibilização do rastreamento','Envio do código ou link de acompanhamento em até 2 dias úteis após a postagem. As movimentações são atualizadas pela transportadora.'],
  ['Entrega estimada','Prazo informado antes da conclusão da compra, conforme o CEP de destino e a modalidade de frete escolhida. Após a postagem, acompanhe as atualizações pelo link de rastreamento.'],
  ['Primeira resposta a uma solicitação','Até 1 dia útil após o recebimento da mensagem em nosso canal oficial.'],
  ['Conferência da ocorrência','Análise inicial em até 2 dias úteis, contados do recebimento do número do pedido e dos registros disponíveis. Quando houver necessidade de apuração pela transportadora, informaremos o andamento e a previsão de conclusão.'],
  ['Postagem do reenvio após a confirmação e escolha do cliente','Até 1 dia útil após a confirmação da cobertura e a escolha pelo reenvio, havendo disponibilidade do produto e possibilidade legal de envio.'],
  ['Solicitação ou execução do reembolso após a confirmação','Pix: devolução em até 1 dia útil. Boleto: transferência em até 2 dias úteis após o recebimento dos dados bancários do titular da compra. Cartão: solicitação de estorno em até 1 dia útil, com crédito conforme o processamento da administradora. Os prazos começam após a confirmação da cobertura e a escolha pelo reembolso.']
 ];
 const faqs=[
  ['Preciso contratar a proteção separadamente?','Não. Ela já está incluída em todos os pedidos, sem cobrança adicional.'],
  ['Se houver extravio, preciso pagar outro frete?','Não. No reenvio de uma ocorrência coberta, os custos dos produtos e do novo frete ficam por nossa conta.'],
  ['Posso escolher o reembolso mesmo havendo possibilidade de reenvio?','Sim. Confirmada a ocorrência coberta, a escolha entre as alternativas é sua.'],
  ['"Em fiscalização" no rastreamento significa que meu pedido foi perdido?','Esse status, por si só, não confirma perda nem impedimento de entrega. Nossa equipe verifica a situação e explica o encaminhamento.'],
  ['Por que vocês pedem a filmagem da abertura?','Porque o vídeo registra as condições da caixa antes da abertura e o conteúdo encontrado dentro dela. Isso agiliza a análise de danos ou divergências.'],
  ['Preciso publicar o vídeo em alguma rede social?','Não. Se houver necessidade de análise, envie o arquivo diretamente pelo canal oficial de atendimento.'],
  ['A proteção garante uma data exata de chegada?','O prazo de entrega é informado conforme o destino e a modalidade contratada. A proteção estabelece a solução para as ocorrências cobertas descritas nesta página.']
 ];
 return shell(`<main class="express-page">
  <section class="express-hero">
   <div class="container express-hero-grid">
    <div class="express-hero-copy">
     <span class="express-eyebrow">ENTREGA EXPRESSA · PROTEÇÃO INCLUSA EM TODOS OS PEDIDOS</span>
     <h1>Seu pedido protegido até chegar na sua porta.</h1>
     <p class="express-lead">Quem compra anabolizante pela internet sabe o que pode acontecer no caminho: a encomenda se perder, ficar presa na fiscalização ou chegar com a caixa violada. Você não deveria carregar esse risco sozinho.</p>
     <p>Por isso, todo pedido sai com proteção contra <strong>extravio no transporte</strong> e <strong>retenção pela fiscalização que impeça a entrega</strong>. Confirmada uma dessas ocorrências, você escolhe: <strong>reenvio sem custo adicional ou reembolso integral do pedido.</strong></p>
     <p>A proteção já está incluída. Não existe taxa, adesão ou letra miúda para ativá-la.</p>
     <div class="express-pills"><span>R$ 0 de taxa de proteção</span><span>Reenvio ou reembolso</span><span>Atendimento direto com nossa equipe</span></div>
     <div class="express-actions"><a class="btn btn-primary btn-lg" href="#cobertura">ENTENDER MINHA PROTEÇÃO</a><a class="btn btn-secondary btn-lg" href="/contato" data-route>PRECISO DE AJUDA COM MEU PEDIDO</a></div>
     <small>Confira abaixo as situações cobertas, como filmar seu recebimento e os prazos de atendimento. Reenvios dependem da possibilidade legal de realizar uma nova entrega.</small>
    </div>
    <div class="express-hero-panel">
     <span class="express-panel-kicker">Proteção de Entrega</span>
     <strong>R$ 0</strong>
     <p>de taxa adicional para ativar a proteção do pedido.</p>
     <div class="express-panel-list"><span>✓ Extravio confirmado</span><span>✓ Retenção que impeça a entrega</span><span>✓ Reenvio ou reembolso</span></div>
    </div>
   </div>
  </section>

  <section class="express-section">
   <div class="container express-split">
    <div><span class="express-index">01</span><span class="express-kicker">Por que fazemos isso</span><h2>Nossa responsabilidade continua depois do envio.</h2></div>
    <div class="express-copy">
     <p>Comprar anabolizante online exige confiança ainda maior do que comprar qualquer outra coisa. Você paga, organiza sua rotina de treino e espera receber exatamente o que escolheu — e sabe que, se algo der errado no transporte, o prejuízo é seu dinheiro, seu tempo e seu ciclo parado.</p>
     <p>Por isso nosso compromisso acompanha o pedido até a entrega. Quando uma encomenda se perde ou fica impedida de chegar, a gente resolve: você fala direto com nossa equipe, acompanha o atendimento e escolhe entre as alternativas disponíveis.</p>
     <strong class="express-emphasis">Cuidar da sua compra faz parte do nosso trabalho — do pagamento até a caixa na sua mão.</strong>
    </div>
   </div>
  </section>

  <section class="express-section express-soft">
   <div class="container">
    <div class="express-heading"><span class="express-index">02</span><span class="express-kicker">Proteção sem cobrança adicional</span><h2>Quanto você paga pela proteção?<br>Zero.</h2><p>A Proteção de Entrega está incluída em todos os pedidos, sem contratação separada e sem acréscimo percentual para ativá-la.</p></div>
    <div class="express-cost-grid">
     <div class="express-zero-card"><small>Custo da proteção</small><strong>R$ 0</strong><span>incluída em todos os pedidos</span></div>
     <div class="express-compare card">
      <p>Para visualizar a diferença, considere uma compra de R$ 500:</p>
      <div class="express-compare-row"><span>Se fosse cobrada uma taxa de 30%</span><strong>R$ 150</strong></div>
      <div class="express-compare-row highlight"><span>Com nossa Proteção de Entrega</span><strong>R$ 0</strong></div>
      <small>Exemplo matemático ilustrativo; não representa uma pesquisa de preços do mercado.</small>
     </div>
    </div>
    <p class="express-note"><strong>A gratuidade se refere à proteção.</strong> O frete da compra, quando houver, é informado separadamente antes do pagamento.</p>
   </div>
  </section>

  <section class="express-section" id="cobertura">
   <div class="container">
    <div class="express-heading"><span class="express-index">03</span><span class="express-kicker">Cobertura</span><h2>Você sabe como vamos agir antes de precisar de ajuda.</h2></div>
    <div class="express-card-grid three">
     <article class="express-card"><span class="express-card-num">01</span><h3>Extravio durante o transporte</h3><p>Se o extravio da encomenda for confirmado, você escolhe um novo envio sem custo adicional ou o reembolso integral do pedido. Nossa equipe acompanha a ocorrência com a transportadora e mantém você informado em cada etapa.</p></article>
     <article class="express-card"><span class="express-card-num">02</span><h3>Retenção pela fiscalização que impeça a entrega</h3><p>Se houver retenção confirmada que impeça a entrega, nossa equipe apresenta as alternativas para resolver seu pedido. Você escolhe entre reenvio, quando legalmente permitido, e reembolso integral. Se houver impedimento legal para um novo envio, a solução será o reembolso.</p></article>
     <article class="express-card"><span class="express-card-num">03</span><h3>Problema identificado ao abrir a caixa</h3><p>Se perceber dano, violação ou divergência no conteúdo — caixa amassada, lacre rompido, item errado ou faltando — registre o ocorrido e fale com nossa equipe.</p><p>A filmagem da caixa e da abertura mostra as condições do recebimento e permite uma conferência mais objetiva.</p></article>
    </div>
    <div class="express-center-action"><a class="btn btn-primary" href="/contato" data-route>SOLICITAR ATENDIMENTO</a></div>
   </div>
  </section>

  <section class="express-section express-deep">
   <div class="container">
    <div class="express-heading light"><span class="express-index">04</span><span class="express-kicker">A escolha é do cliente</span><h2>Reenvio ou reembolso.<br>Você escolhe como prefere resolver.</h2><p>Confirmada uma ocorrência coberta, iniciamos imediatamente o procedimento que você escolher.</p></div>
    <div class="express-choice-grid">
     <article class="express-choice"><span>01</span><h3>Quero receber meu pedido</h3><p>Organizamos o reenvio sem cobrança pelos produtos nem pelo novo frete, conforme disponibilidade e possibilidade legal de envio. Você recebe a confirmação da nova postagem e o código para acompanhar a entrega.</p></article>
     <article class="express-choice"><span>02</span><h3>Prefiro meu dinheiro de volta</h3><p>Providenciamos o reembolso integral do pedido não entregue, incluindo o frete originalmente pago à nossa loja, quando houver. A devolução é feita em dinheiro pelo meio de pagamento aplicável. Crédito para compras futuras só será utilizado se você escolher essa opção.</p></article>
    </div>
    <small class="express-deep-note">Os prazos de conferência, postagem e processamento do reembolso estão apresentados nesta página.</small>
   </div>
  </section>

  <section class="express-section">
   <div class="container">
    <div class="express-heading"><span class="express-index">05</span><span class="express-kicker">Como filmar sua encomenda</span><h2>Sua encomenda chegou?<br>Comece a filmar antes de abrir.</h2><p>Esse vídeo é a sua garantia de que o produto chegou intacto — e é o que agiliza qualquer atendimento. Grave <strong>um único vídeo contínuo</strong>, mostrando a caixa ainda fechada e, em seguida, toda a abertura:</p></div>
    <div class="express-steps">${filmingSteps.map((s,i)=>`<article class="express-step"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p></div></article>`).join('')}</div>
    <div class="express-alert"><strong>Se a caixa já chegar aberta ou danificada, registre exatamente como foi recebida.</strong><p>Não tente refazer a embalagem.</p></div>
    <p class="express-emphasis">A filmagem comprova o estado do pedido na chegada e agiliza a solução de qualquer ocorrência.</p>
    <div class="express-mini-grid">
     <article class="card express-mini"><h3>Seu pedido não chegou?</h3><p>Em casos de extravio ou retenção, não há exigência de vídeo de abertura. A conferência usa os registros de transporte e os documentos disponíveis sobre a ocorrência.</p></article>
     <article class="card express-mini"><h3>Não conseguiu filmar?</h3><p>Fale com a gente mesmo assim. Vamos orientar a apresentação de outros registros e analisar o caso, preservando os direitos previstos na legislação aplicável.</p></article>
    </div>
   </div>
  </section>

  <section class="express-section express-soft">
   <div class="container">
    <div class="express-heading"><span class="express-index">06</span><span class="express-kicker">Prazos</span><h2>Você precisa saber quando esperar.<br>E quando receber uma resposta.</h2><p>O prazo de entrega considera o destino e a modalidade de transporte disponível para o seu pedido. Para facilitar o acompanhamento, informamos separadamente:</p></div>
    <div class="express-table-wrap"><table class="express-table"><thead><tr><th>Etapa</th><th>Prazo</th></tr></thead><tbody>${deadlines.map(([stage,time])=>`<tr><td>${esc(stage)}</td><td><strong>${esc(time)}</strong></td></tr>`).join('')}</tbody></table></div>
    <div class="express-mini-grid express-deadline-notes">
     <article class="card express-mini"><h3>Como contamos os prazos</h3><p>Os prazos internos da loja são contados em dias úteis, de segunda a sexta-feira, exceto feriados, a partir do primeiro dia útil seguinte ao evento indicado.</p><p>O prazo de preparação e postagem é separado do prazo de transporte. Antes do pagamento, informamos a previsão total de recebimento considerando essas duas etapas.</p></article>
     <article class="card express-mini"><h3>Se precisar acionar a proteção</h3><p>Você recebe uma primeira resposta dentro do prazo de atendimento. A análise inicial pode exigir informações adicionais; ela não significa, necessariamente, que a apuração da transportadora estará concluída nesse período.</p></article>
    </div>
    <div class="express-note-stack"><p>Em pagamentos por cartão, o prazo para o crédito aparecer na fatura também depende do processamento da administradora.</p><p>Se o prazo informado para sua entrega terminar e o pedido não chegar, entre em contato para iniciarmos a verificação.</p></div>
    <a class="btn btn-primary" href="/rastreamento" data-route>CONSULTAR MEU PEDIDO</a>
   </div>
  </section>

  <section class="express-section">
   <div class="container">
    <div class="express-heading"><span class="express-index">07</span><span class="express-kicker">Como pedir ajuda</span><h2>Um caminho claro para resolver.</h2></div>
    <div class="express-process-grid">
     <article><span>01</span><h3>Entre em contato pelo canal oficial</h3><p>Informe o número do pedido e descreva o que aconteceu.</p></article>
     <article><span>02</span><h3>Envie os registros disponíveis</h3><p>Para problemas no recebimento, encaminhe o vídeo e as imagens que mostrem a situação. Para extravio ou retenção, envie a comunicação recebida, caso tenha alguma.</p></article>
     <article><span>03</span><h3>Acompanhe a conferência</h3><p>Nossa equipe informa o andamento e explica se alguma informação adicional é necessária.</p></article>
     <article><span>04</span><h3>Escolha a solução</h3><p>Confirmada a cobertura, você escolhe reenvio ou reembolso, observadas as condições apresentadas nesta página.</p></article>
    </div>
    <div class="express-contact card"><div><small>Canal oficial</small><strong>[INSERIR CONTATO]</strong></div><div><small>Horário de atendimento</small><strong>[INSERIR DIAS, HORÁRIOS E FUSO]</strong></div><a class="btn btn-primary" href="/contato" data-route>RESOLVER UM PROBLEMA COM MINHA ENTREGA</a></div>
   </div>
  </section>

  <section class="express-section express-soft">
   <div class="container express-faq-wrap">
    <div class="express-heading"><span class="express-index">08</span><span class="express-kicker">Perguntas frequentes</span><h2>As dúvidas mais importantes, respondidas direto.</h2></div>
    <div class="express-faq">${faqs.map(([q,ans])=>`<details class="express-faq-item"><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('')}</div>
   </div>
  </section>

  <section class="express-closing">
   <div class="container">
    <span class="express-index">09</span><span class="express-kicker">Confiança</span>
    <h2>Sua confiança merece uma resposta concreta.</h2>
    <p>Proteção incluída, informações claras e uma equipe responsável por acompanhar o seu pedido do pagamento à entrega.</p>
    <p>Se houver uma ocorrência coberta, você sabe com quem falar e quais soluções pode escolher.</p>
    <strong>Reenvio sem custo adicional ou reembolso integral.<br>Proteção gratuita em todos os pedidos.</strong>
    <div class="express-actions"><a class="btn btn-primary btn-lg" href="/contato" data-route>TIRAR DÚVIDAS SOBRE A ENTREGA</a><a class="btn btn-secondary btn-lg" href="/contato" data-route>SOLICITAR ATENDIMENTO</a></div>
    <small>Esta política de proteção comercial não limita os direitos do consumidor previstos na legislação aplicável.</small>
   </div>
  </section>
 </main>`);
}

function transparencyPage(){
 const manufacturerItems=[
  ['Laboratório','Nome e identificação da empresa fabricante.'],
  ['Origem','País de fabricação separado do país de distribuição.'],
  ['Canais oficiais','Site e canais oficiais de atendimento.'],
  ['Documentação','Referências que sustentam as informações publicadas.'],
  ['Verificação','Recursos de autenticidade oferecidos pelo fabricante.']
 ];
 const traceItems=[
  ['01','Origem do fornecimento','Documentação de aquisição e origem identificada.'],
  ['02','Produto recebido','Nome, apresentação e fabricante conferidos.'],
  ['03','Lote e validade','Número do lote e prazo de validade registrados.'],
  ['04','Recebimento','Data de recebimento e conferência registrada.'],
  ['05','Pedido expedido','Vinculação do lote ao pedido enviado ao cliente.']
 ];
 const documentChecks=[
  ['Produto e apresentação','Identificação exata do item ao qual o documento se refere.'],
  ['Lote ou amostra','Correspondência entre o material analisado e o lote informado.'],
  ['Emissor','Laboratório ou entidade responsável pelo documento.'],
  ['Data e identificação','Data, código ou referência que permita localizar o arquivo.'],
  ['Ensaios e resultados','O que foi efetivamente analisado e quais resultados constam no documento.']
 ];
 const validationSteps=[
  ['1','Identifique','Confira fabricante, lote e validade na embalagem.'],
  ['2','Acesse','Use o canal oficial indicado para aquela marca.'],
  ['3','Consulte','Verifique o código de autenticidade, quando esse recurso existir.'],
  ['4','Compare','Se houver divergência, encaminhe as informações ao nosso suporte.']
 ];
 const docStatuses=[
  ['Disponível para consulta','O arquivo está acessível, com indicação de origem e identificação do produto ou lote correspondente.','available'],
  ['Em conferência','O documento foi recebido, mas sua origem, correspondência ou conteúdo ainda está sendo verificado.','review'],
  ['Não disponível','O documento ainda não está disponível para apresentação ao cliente.','unavailable']
 ];
 return shell(`<main class="transparency-page">
  <section class="transparency-hero">
   <div class="container transparency-hero-grid">
    <div class="transparency-hero-copy">
     <span class="transparency-eyebrow">GLOBAL PHARMA · TRANSPARÊNCIA</span>
     <h1>Confiança começa com informação que você pode conferir.</h1>
     <p class="transparency-lead">Quem compra medicamento importado tem uma preocupação a mais: saber se o que chegou é exatamente o que saiu do laboratório — mesma apresentação, mesmo lote, mesma origem.</p>
     <p>Na Global Pharma, nosso compromisso é trabalhar com laboratórios de origem identificada, manter registros dos lotes comercializados e facilitar o acesso às informações oficiais dos fabricantes.</p>
     <p>Você pode conhecer os critérios de seleção das marcas, consultar a documentação disponível e solicitar esclarecimentos sobre o seu produto.</p>
     <div class="transparency-pills"><span>Procedência documentada</span><span>Fabricantes identificados</span><span>Informações por lote</span></div>
     <div class="transparency-actions"><a class="btn btn-primary btn-lg" href="#documentacao">CONSULTAR MARCAS E DOCUMENTAÇÃO</a><a class="btn btn-secondary btn-lg" href="/contato" data-route>ESCLARECER UMA DÚVIDA</a></div>
    </div>
    <aside class="transparency-hero-panel">
     <span class="transparency-panel-kicker">O que você consegue conferir</span>
     <div class="transparency-check-list">
      <span>✓ Quem fabrica</span>
      <span>✓ De onde vem</span>
      <span>✓ Qual lote foi informado</span>
      <span>✓ Quais documentos estão disponíveis</span>
      <span>✓ Qual é a fonte de cada informação</span>
     </div>
    </aside>
   </div>
  </section>

  <section class="transparency-section">
   <div class="container">
    <div class="transparency-heading"><span class="transparency-index">01</span><span class="transparency-kicker">Marcas e fabricantes</span><h2>Você merece saber quem está por trás do medicamento.</h2><p>Nosso critério é trabalhar com laboratórios cuja identidade e procedência possam ser documentadas, com canais oficiais que permitam solicitar esclarecimentos sobre seus produtos.</p><p>Essa conferência considera a identificação do fabricante, a origem do fornecimento, a documentação apresentada e as possibilidades de confirmação diretamente com a marca.</p></div>
    <div class="transparency-feature-grid">${manufacturerItems.map(([title,text],i)=>`<article class="transparency-feature"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div>
    <div class="transparency-callout"><strong>Fabricante, distribuidor e importador não são tratados como a mesma função.</strong><p>Quando forem diferentes, essas funções serão identificadas separadamente.</p></div>
    <p class="transparency-strong-note">Qualquer vínculo de representação oficial ou distribuição autorizada será informado somente quando houver comprovação.</p>
   </div>
  </section>

  <section class="transparency-section transparency-soft">
   <div class="container">
    <div class="transparency-heading"><span class="transparency-index">02</span><span class="transparency-kicker">Procedência e rastreabilidade</span><h2>Cada lote precisa ter uma origem identificável.</h2><p>Nosso compromisso com a rastreabilidade é manter a ligação entre o fornecedor, o produto recebido, o lote identificado na embalagem e o pedido enviado ao cliente.</p><p>O controle por lote permite localizar informações, esclarecer divergências e apoiar a investigação de uma eventual ocorrência.</p></div>
    <div class="transparency-trace">${traceItems.map(([n,title,text])=>`<article><span class="trace-number">${n}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></article>`).join('')}</div>
    <div class="transparency-callout blue"><strong>Rastreabilidade tem alcance definido.</strong><p>A expressão “rastreabilidade completa” só será utilizada quando todas as etapas anunciadas estiverem documentadas.</p></div>
   </div>
  </section>

  <section class="transparency-section" id="documentacao">
   <div class="container">
    <div class="transparency-heading"><span class="transparency-index">03</span><span class="transparency-kicker">Laudos e documentação</span><h2>O documento precisa corresponder ao produto e ao lote.</h2><p>Nosso compromisso é disponibilizar a documentação técnica correspondente aos produtos e lotes comercializados, identificando a origem de cada arquivo.</p></div>
    <div class="transparency-doc-layout">
     <div class="transparency-doc-card">
      <span class="transparency-doc-icon">DOC</span>
      <h3>O que conferimos em um laudo ou certificado</h3>
      <div class="transparency-doc-checks">${documentChecks.map(([title,text])=>`<div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`).join('')}</div>
     </div>
     <div class="transparency-principles">
      <article><strong>Correspondência de lote</strong><p>Um documento referente a determinado lote não será apresentado como comprovação de outro.</p></article>
      <article><strong>Origem do documento</strong><p>Distinguimos documentos emitidos pelo fabricante de análises realizadas por laboratórios independentes.</p></article>
      <article><strong>Limite da evidência</strong><p>Um laudo informa os resultados dos ensaios descritos naquele documento. Não representa, isoladamente, comprovação de todas as características do produto.</p></article>
     </div>
    </div>
    <div class="transparency-center-action"><a class="btn btn-primary" href="/produtos" data-route>CONSULTAR DOCUMENTAÇÃO DISPONÍVEL</a></div>
   </div>
  </section>

  <section class="transparency-section transparency-deep">
   <div class="container">
    <div class="transparency-heading light"><span class="transparency-index">04</span><span class="transparency-kicker">Validação com o fabricante</span><h2>A informação pode ser conferida na fonte.</h2><p>Disponibilizamos os canais oficiais identificados dos fabricantes para que você possa solicitar esclarecimentos sobre embalagens, lotes e recursos de autenticidade.</p><p>Quando a marca oferecer um sistema próprio de verificação, orientamos como acessá-lo e quais informações são necessárias para a consulta.</p></div>
    <div class="transparency-validation">${validationSteps.map(([n,title,text])=>`<article><span>${n}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div>
    <div class="transparency-deep-callout"><strong>Nossa equipe pode auxiliar no encaminhamento.</strong><p>A confirmação será atribuída ao fabricante apenas quando houver uma resposta ou resultado oficial correspondente.</p></div>
    <p class="transparency-deep-note">Um QR Code que apenas abre um site não equivale, por si só, à autenticação da unidade recebida.</p>
    <a class="btn btn-secondary" href="/contato" data-route>CONSULTAR CANAIS DOS FABRICANTES</a>
   </div>
  </section>

  <section class="transparency-section">
   <div class="container transparency-integrity-grid">
    <div class="transparency-heading"><span class="transparency-index">05</span><span class="transparency-kicker">Integridade e conservação</span><h2>Transparência também inclui os cuidados com o produto.</h2><p>Medicamento é sensível a temperatura e umidade. A conferência deve considerar a integridade da embalagem, os lacres, a legibilidade das informações e a correspondência entre produto, lote e validade.</p><p>As condições de armazenamento e transporte seguem as orientações específicas do fabricante. Quando houver necessidade de controle de temperatura, essa exigência é informada no anúncio do produto.</p></div>
    <aside class="transparency-integrity-card">
     <span>CONFERIR NO RECEBIMENTO</span>
     <div><strong>01</strong><p>Embalagem e lacres</p></div>
     <div><strong>02</strong><p>Lote e validade</p></div>
     <div><strong>03</strong><p>Legibilidade das informações</p></div>
     <div><strong>04</strong><p>Condições de conservação</p></div>
    </aside>
   </div>
   <div class="container"><div class="transparency-alert"><strong>Importante:</strong><p>Alegações de transporte refrigerado ou temperatura monitorada são acompanhadas dos registros que as sustentam.</p><p>Caso identifique embalagem violada, informação divergente ou suspeita sobre a conservação, entre em contato antes de utilizar o produto.</p></div></div>
  </section>

  <section class="transparency-section transparency-soft">
   <div class="container">
    <div class="transparency-heading"><span class="transparency-index">06</span><span class="transparency-kicker">Informações regulatórias</span><h2>Origem, autenticidade e regularização são informações distintas.</h2><p>Apresentamos os dados regulatórios disponíveis identificando o produto, a autoridade responsável, o país de referência e a fonte consultada.</p></div>
    <div class="transparency-reg-grid">
     <article><span>ORIGEM</span><h3>De onde vem</h3><p>Identificação do fabricante, país e cadeia de fornecimento disponível.</p></article>
     <article><span>AUTENTICIDADE</span><h3>O que pode ser conferido</h3><p>Códigos, canais e respostas oficiais do fabricante, quando existentes.</p></article>
     <article><span>REGULARIZAÇÃO</span><h3>Qual autorização se aplica</h3><p>Registros e autorizações descritos conforme o país e o alcance de cada fonte.</p></article>
    </div>
    <div class="transparency-callout warning"><strong>Um registro de outro país não é apresentado como aprovação pela Anvisa.</strong><p>A existência de laudo, código de verificação ou confirmação do fabricante não é utilizada como substituto da regularização exigida para o produto e a operação.</p></div>
    <p class="transparency-strong-note">Você deve conseguir identificar o que foi consultado, onde foi consultado e quando a informação foi atualizada.</p>
   </div>
  </section>

  <section class="transparency-section" id="status-documental">
   <div class="container">
    <div class="transparency-heading"><span class="transparency-index">07</span><span class="transparency-kicker">Documentos disponíveis e pendências</span><h2>A ausência de informação também precisa ficar clara.</h2><p>Cada documento tem sua situação identificada:</p></div>
    <div class="transparency-status-grid">${docStatuses.map(([title,text,status])=>`<article class="transparency-status ${status}"><span class="status-dot"></span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div>
    <div class="transparency-principles horizontal">
     <article><strong>Publicação não é certificação</strong><p>A publicação de um arquivo não significa certificação independente pela Global Pharma.</p></article>
     <article><strong>Limitações são informadas</strong><p>Quando uma informação não estiver comprovada, essa limitação é apresentada de forma clara.</p></article>
     <article><strong>Pendência relevante precisa ser resolvida</strong><p>Uma pendência documental relevante precisa ser esclarecida antes de o produto ser tratado como verificado.</p></article>
    </div>
   </div>
  </section>

  <section class="transparency-section transparency-support">
   <div class="container transparency-support-grid">
    <div class="transparency-heading light"><span class="transparency-index">08</span><span class="transparency-kicker">Atendimento e responsabilidade</span><h2>Sua dúvida merece uma resposta verificável.</h2><p>Nosso atendimento recebe solicitações sobre procedência, documentação, identificação de lotes, embalagens e informações oficiais dos fabricantes.</p><p>Também disponibilizamos um canal para comunicar divergências, suspeitas de falsificação, problemas de qualidade e possíveis eventos adversos, com encaminhamento ao responsável adequado.</p></div>
    <div class="transparency-support-card">
     <h3>Para agilizar a conferência</h3>
     <div><span>01</span><p>Informe o número do pedido.</p></div>
     <div><span>02</span><p>Informe o nome do produto.</p></div>
     <div><span>03</span><p>Informe o lote.</p></div>
     <div><span>04</span><p>Envie fotos da embalagem, quando necessário.</p></div>
     <a class="btn btn-primary" href="/contato" data-route>SOLICITAR INFORMAÇÕES SOBRE MEU PRODUTO</a>
    </div>
   </div>
   <div class="container"><p class="transparency-medical-note">Informações técnicas sobre medicamentos devem respeitar a documentação oficial. Nosso atendimento comercial não substitui a orientação de médico ou farmacêutico.</p></div>
  </section>

  <section class="transparency-closing">
   <div class="container">
    <span class="transparency-kicker">GLOBAL PHARMA</span>
    <h2>Respeito pela sua confiança.<br>Responsabilidade com cada informação.</h2>
    <p>Nosso compromisso com a transparência se traduz em procedência documentada, informações acessíveis e clareza sobre o que foi confirmado e o que ainda precisa de esclarecimento.</p>
    <strong>Conheça a marca. Confira o lote. Consulte a documentação.</strong>
    <div class="transparency-actions"><a class="btn btn-primary btn-lg" href="/produtos" data-route>CONSULTAR INFORMAÇÕES DO PRODUTO</a><a class="btn btn-secondary btn-lg" href="/contato" data-route>FALAR COM A GLOBAL PHARMA</a></div>
   </div>
  </section>
 </main>`);
}

function genericPage(title,text){return shell(`<main><section class="page-hero"><div class="container"><span class="badge">Global Pharma</span><h1>${esc(title)}</h1><p>${esc(text)}</p></div></section><section class="section"><div class="container"><div class="card info-block"><h2>${esc(title)}</h2><p class="pdp-sub">${esc(text)}</p></div></div></section></main>`)}

function checkout(){
 const items=state.cart.map(i=>({i,p:state.products.find(p=>p.slug===i.slug)})).filter(x=>x.p);
 const subtotal=items.reduce((sum,{i,p})=>sum+(i.shipping==='express'&&p.expressAvailable?p.pricing.express:p.pricing.basic)*i.qty,0);
 const bumps=eligibleOrderBumps(items);
 const selected=new Set(state.selectedBumpIds);
 const selectedBumps=bumps.filter(b=>selected.has(b.id));
 const bumpTotal=selectedBumps.reduce((sum,b)=>sum+(b.priceCents/100),0);
 const total=subtotal+bumpTotal;
 const bumpCards=bumps.map(b=>{
   const product=state.products.find(p=>p.id===b.productId);
   const image=b.imageUrl||product?.media?.find(m=>m.src)?.src||'';
   const checked=selected.has(b.id);
   return `<label class="order-bump-card ${checked?'selected':''}" data-bump-card="${esc(b.id)}">
     <input type="checkbox" data-order-bump="${esc(b.id)}" ${checked?'checked':''}>
     <span class="order-bump-check">✓</span>
     ${image?`<img class="order-bump-image" src="${esc(image)}" alt="">`:`<div class="order-bump-image order-bump-placeholder">+</div>`}
     <span class="order-bump-copy">
       ${b.badge?`<small class="order-bump-badge">${esc(b.badge)}</small>`:''}
       <strong>${esc(b.title)}</strong>
       ${b.description?`<span>${esc(b.description)}</span>`:''}
       <span class="order-bump-price">${b.compareAtCents!=null?`<del>${money(b.compareAtCents/100)}</del>`:''}<b>${money(b.priceCents/100)}</b></span>
       <em>${esc(b.checkboxLabel)}</em>
     </span>
   </label>`;
 }).join('');
 const paymentCopy=state.checkoutPaymentMethod==='pix'
   ?'<strong>Pix</strong><span>O QR Code e o copia-e-cola serão gerados aqui pelo gateway após a integração.</span>'
   :state.checkoutPaymentMethod==='card'
     ?'<strong>Cartão</strong><span>Os campos seguros/tokenizados do provedor serão carregados aqui. O site não armazenará número do cartão nem CVV.</span>'
     :'<strong>Boleto</strong><span>O boleto será gerado aqui pelo provedor de pagamento após a integração.</span>';
 return shell(`<main class="transparent-checkout">
  <section class="checkout-head"><div class="container"><span class="badge">Checkout seguro</span><h1>Finalize seu pedido sem sair da Global Pharma.</h1><p>Dados, entrega, ofertas adicionais e pagamento em um único fluxo.</p></div></section>
  <section class="checkout-section"><div class="container checkout-grid checkout-grid-premium">
   <form id="checkoutForm" class="checkout-main">
    <section class="card checkout-block"><div class="checkout-step-title"><span>1</span><div><small>Identificação</small><h2>Seus dados</h2></div></div><div class="form-grid">
     <div class="field"><label>Nome completo</label><input class="input" name="name" autocomplete="name" required></div>
     <div class="field"><label>CPF</label><input class="input" name="document" inputmode="numeric" required></div>
     <div class="field"><label>E-mail</label><input class="input" type="email" name="email" autocomplete="email" required></div>
     <div class="field"><label>Telefone</label><input class="input" name="phone" autocomplete="tel" required></div>
    </div></section>

    <section class="card checkout-block"><div class="checkout-step-title"><span>2</span><div><small>Entrega</small><h2>Endereço</h2></div></div><div class="form-grid">
     <div class="field"><label>CEP</label><input class="input" name="postal" autocomplete="postal-code" required></div>
     <div class="field"><label>Cidade</label><input class="input" name="city" autocomplete="address-level2" required></div>
     <div class="field"><label>Estado</label><input class="input" name="state" autocomplete="address-level1" required></div>
     <div class="field"><label>Número</label><input class="input" name="number" required></div>
     <div class="field full"><label>Endereço</label><input class="input" name="address" autocomplete="street-address" required></div>
     <div class="field full"><label>Complemento</label><input class="input" name="complement"></div>
    </div></section>

    ${bumps.length?`<section class="card checkout-block order-bumps-block"><div class="checkout-step-title"><span>+</span><div><small>Oferta exclusiva</small><h2>Adicione ao seu pedido</h2></div></div><div class="order-bumps-list">${bumpCards}</div></section>`:''}

    <section class="card checkout-block"><div class="checkout-step-title"><span>3</span><div><small>Pagamento</small><h2>Como deseja pagar?</h2></div></div>
     <div class="payment-methods">
      <button type="button" class="payment-method ${state.checkoutPaymentMethod==='pix'?'active':''}" data-payment-method="pix">Pix</button>
      <button type="button" class="payment-method ${state.checkoutPaymentMethod==='card'?'active':''}" data-payment-method="card">Cartão</button>
      <button type="button" class="payment-method ${state.checkoutPaymentMethod==='boleto'?'active':''}" data-payment-method="boleto">Boleto</button>
     </div>
     <div class="payment-provider-slot">${paymentCopy}</div>
     <div class="checkout-security-note">🔒 O processamento real será feito pelo gateway em ambiente seguro. Nenhum segredo de API ou dado sensível de cartão ficará exposto no navegador.</div>
     <button class="btn btn-primary btn-lg checkout-pay-button" type="submit" ${items.length?'':'disabled'}>CONTINUAR PARA PAGAMENTO · ${money(total)}</button>
    </section>
   </form>

   <aside class="card checkout-summary">
    <div class="checkout-summary-head"><h2>Resumo do pedido</h2><span>${cartCount()} ${cartCount()===1?'item':'itens'}</span></div>
    ${items.length?items.map(({i,p})=>`<div class="checkout-summary-line"><div><strong>${esc(p.displayName)}</strong><small>${i.shipping==='express'?'Entrega expressa':'Entrega padrão'} · Qtd. ${i.qty}</small></div><b>${money((i.shipping==='express'&&p.expressAvailable?p.pricing.express:p.pricing.basic)*i.qty)}</b></div>`).join(''):`<div class="empty">Seu carrinho está vazio.</div>`}
    ${selectedBumps.map(b=>`<div class="checkout-summary-line bump"><div><strong>+ ${esc(b.title)}</strong><small>Order bump</small></div><b>${money(b.priceCents/100)}</b></div>`).join('')}
    <div class="checkout-summary-totals"><div><span>Produtos</span><strong>${money(subtotal)}</strong></div>${bumpTotal?`<div><span>Ofertas adicionadas</span><strong>${money(bumpTotal)}</strong></div>`:''}<div class="grand"><span>Total</span><strong>${money(total)}</strong></div></div>
    <div class="checkout-trust"><span>✓ Compra protegida</span><span>✓ Proteção de entrega</span><span>✓ Atendimento especializado</span></div>
   </aside>
  </div></section>
 </main>`);
}

function adminShell(content,active='produtos'){return header()+`<div class="admin-layout"><aside class="admin-side"><h3>Admin</h3><a class="admin-link ${active==='inicio'?'active':''}" href="/admin" data-route>Visão geral</a><a class="admin-link ${active==='produtos'?'active':''}" href="/admin/produtos" data-route>Produtos</a><a class="admin-link ${active==='bumps'?'active':''}" href="/admin/order-bumps" data-route>Order bumps</a><a class="admin-link ${active==='metricas'?'active':''}" href="/admin/order-bumps/metricas" data-route>Métricas dos bumps</a><a class="admin-link" href="/" data-route>Ver site</a><button class="admin-link" id="adminLogout" type="button" style="width:100%;text-align:left;background:none;border:0;cursor:pointer">Sair</button></aside><main class="admin-main">${content}</main></div>`}
function adminAccess(){
  if(!state.authUser)return header()+`<main class="section"><div class="container" style="max-width:560px"><div class="card info-block"><span class="pdp-kicker">Área administrativa</span><h1 style="color:var(--navy)">Acesso ao painel</h1><p style="color:var(--muted)">Apenas o administrador autorizado pode acessar esta área.</p><form id="adminLoginForm" style="margin-top:20px"><div class="field"><label>E-mail</label><input class="input" type="email" value="vendettavenon@gmail.com" readonly></div><div class="field"><label>Senha</label><input class="input" type="password" name="password" autocomplete="current-password" required></div><button class="btn btn-primary" style="margin-top:12px;width:100%">ENTRAR</button></form></div></div></main>`;
  if(!state.isAdmin)return header()+`<main class="section"><div class="container" style="max-width:560px"><div class="card info-block"><span class="pdp-kicker">Acesso negado</span><h1 style="color:var(--navy)">Conta sem permissão</h1><p>Somente <strong>vendettavenon@gmail.com</strong> pode administrar este site.</p><button class="btn btn-secondary" id="adminLogout" type="button">Sair</button></div></div></main>`;
  if(state.mustChangePassword)return header()+`<main class="section"><div class="container" style="max-width:560px"><div class="card info-block"><span class="pdp-kicker">Primeiro acesso</span><h1 style="color:var(--navy)">Defina uma nova senha</h1><p style="color:var(--muted)">Por segurança, o painel só será liberado depois que você trocar a senha temporária.</p><form id="adminPasswordForm" style="margin-top:20px"><div class="field"><label>Nova senha</label><input class="input" type="password" name="password" minlength="10" autocomplete="new-password" required></div><div class="field"><label>Confirmar nova senha</label><input class="input" type="password" name="confirm" minlength="10" autocomplete="new-password" required></div><button class="btn btn-primary" style="margin-top:12px;width:100%">ATUALIZAR SENHA</button></form></div></div></main>`;
  return '';
}
function adminOverview(){return adminShell(`<div class="admin-toolbar"><div><h1 style="margin:0;color:var(--navy)">Dashboard</h1><p style="color:var(--muted)">Catálogo conectado ao Supabase.</p></div></div><div class="trust-grid"><div class="card trust-card"><strong>${state.products.length}</strong><p>Produtos cadastrados</p></div><div class="card trust-card"><strong>${state.products.filter(p=>p.isActive).length}</strong><p>Produtos ativos</p></div><div class="card trust-card"><strong>${state.cart.length}</strong><p>Linhas no carrinho local</p></div><div class="card trust-card"><strong>Online</strong><p>Persistência centralizada no Supabase</p></div></div>`,'inicio')}
function blankOrderBump(){return {id:'',internalName:'',title:'',description:'',productId:'',triggerProductId:'',imageUrl:'',badge:'Oferta exclusiva',checkboxLabel:'Sim, quero adicionar esta oferta ao meu pedido',priceCents:0,compareAtCents:null,maxQty:1,isActive:true,sortOrder:999,__new:true}}
function adminOrderBumps(){
 const rows=[...state.orderBumps].sort((a,b)=>a.sortOrder-b.sortOrder);
 if(state.orderBumpEditing){
  const b=state.orderBumpEditing;
  const productOptions=state.products.map(p=>`<option value="${esc(p.id)}" ${b.productId===p.id?'selected':''}>${esc(p.displayName||p.name)}</option>`).join('');
  const triggerOptions=state.products.map(p=>`<option value="${esc(p.id)}" ${b.triggerProductId===p.id?'selected':''}>${esc(p.displayName||p.name)}</option>`).join('');
  return adminShell(`<div class="admin-toolbar"><div><h1 style="margin:0;color:var(--navy)">${b.__new?'Novo order bump':'Editar order bump'}</h1><p style="color:var(--muted)">Configure a oferta que aparece dentro do checkout.</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" id="cancelBumpEdit">Cancelar</button><button class="btn btn-primary" id="saveOrderBump">Salvar order bump</button></div></div>
   <form id="orderBumpForm" class="card bump-admin-form"><div class="editor-grid">
    ${field('Nome interno','bump.internalName',b.internalName)}
    ${field('Título da oferta','bump.title',b.title)}
    ${area('Descrição','bump.description',b.description,'full')}
    <div class="field"><label>Produto oferecido</label><select class="select" name="bump.productId"><option value="">Oferta personalizada / sem vínculo</option>${productOptions}</select></div>
    <div class="field"><label>Exibir quando o carrinho contém</label><select class="select" name="bump.triggerProductId"><option value="">Qualquer produto</option>${triggerOptions}</select></div>
    ${field('Imagem da oferta (URL)','bump.imageUrl',b.imageUrl,'url')}
    ${field('Selo / badge','bump.badge',b.badge)}
    ${field('Texto do checkbox','bump.checkboxLabel',b.checkboxLabel)}
    ${field('Preço do bump (R$)','bump.priceReais',(b.priceCents/100)||0,'number')}
    ${field('Preço de comparação (R$)','bump.compareAtReais',b.compareAtCents==null?'':b.compareAtCents/100,'number')}
    ${field('Quantidade máxima','bump.maxQty',b.maxQty,'number')}
    ${field('Ordem de exibição','bump.sortOrder',b.sortOrder,'number')}
    <div class="field"><label>Status</label><select class="select" name="bump.isActive"><option value="true" ${b.isActive?'selected':''}>Ativo</option><option value="false" ${!b.isActive?'selected':''}>Arquivado</option></select></div>
   </div><div class="completion"><strong>Regra:</strong> o preço do order bump é independente do preço normal do produto. A oferta só aparece no checkout quando estiver ativa e a condição de carrinho for atendida.</div></form>`,'bumps');
 }
 return adminShell(`<div class="admin-toolbar"><div><h1 style="margin:0;color:var(--navy)">Order bumps</h1><p style="color:var(--muted)">Cadastre ofertas adicionais exibidas dentro do checkout transparente.</p></div><button class="btn btn-primary" id="newOrderBump">+ Novo order bump</button></div>
  ${rows.length?`<div class="admin-table"><table><thead><tr><th>Oferta</th><th>Preço</th><th>Gatilho</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(b=>{const trigger=state.products.find(p=>p.id===b.triggerProductId);return `<tr><td><strong>${esc(b.internalName||b.title)}</strong><br><small>${esc(b.title)}</small></td><td>${money(b.priceCents/100)}</td><td>${trigger?esc(trigger.displayName||trigger.name):'Qualquer carrinho'}</td><td><span class="status ${b.isActive?'on':'off'}">${b.isActive?'ATIVO':'ARQUIVADO'}</span></td><td><button class="btn btn-secondary" data-edit-bump="${esc(b.id)}">Editar</button> <button class="btn ${b.isActive?'btn-danger':'btn-soft'}" data-toggle-bump="${esc(b.id)}">${b.isActive?'Arquivar':'Restaurar'}</button></td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">Nenhum order bump cadastrado. Crie o primeiro para começar a testar conversão no checkout.</div>`}`,'bumps');
}
function orderBumpMetrics(){
 const cutoff=Date.now()-30*24*60*60*1000;
 const events=state.orderBumpEvents.filter(e=>new Date(e.created_at).getTime()>=cutoff);
 const count=t=>events.filter(e=>e.event_type===t).length;
 const impressions=count('impression'),accepts=count('accept'),submits=count('checkout_submit');
 const acceptRate=impressions?accepts/impressions*100:0;
 const submitRate=impressions?submits/impressions*100:0;
 const potential=state.orderBumps.reduce((sum,b)=>sum+events.filter(e=>e.order_bump_id===b.id&&e.event_type==='accept').length*(b.priceCents/100),0);
 const rows=state.orderBumps.map(b=>{
   const be=events.filter(e=>e.order_bump_id===b.id);
   const imp=be.filter(e=>e.event_type==='impression').length;
   const acc=be.filter(e=>e.event_type==='accept').length;
   const sub=be.filter(e=>e.event_type==='checkout_submit').length;
   return {b,imp,acc,sub,rate:imp?acc/imp*100:0,value:acc*(b.priceCents/100)};
 }).sort((x,y)=>y.imp-x.imp);
 return adminShell(`<div class="admin-toolbar"><div><h1 style="margin:0;color:var(--navy)">Métricas dos order bumps</h1><p style="color:var(--muted)">Últimos 30 dias · funil de exposição, aceite e avanço para pagamento.</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" id="refreshBumpMetrics">Atualizar métricas</button><a class="btn btn-secondary" href="/checkout" data-route>Ver checkout</a></div></div>
  <div class="bump-metrics-grid">
   <div class="card bump-metric"><small>Impressões</small><strong>${impressions}</strong><span>ofertas visualizadas</span></div>
   <div class="card bump-metric"><small>Aceites</small><strong>${accepts}</strong><span>${acceptRate.toFixed(1)}% de aceite</span></div>
   <div class="card bump-metric"><small>Avanços para pagamento</small><strong>${submits}</strong><span>${submitRate.toFixed(1)}% das impressões</span></div>
   <div class="card bump-metric"><small>Valor potencial adicionado</small><strong>${money(potential)}</strong><span>não é receita confirmada</span></div>
  </div>
  <div class="card bump-metrics-note"><strong>Compra aprovada ainda não está sendo contabilizada.</strong><p>Essa métrica será adicionada quando o gateway transparente estiver conectado e devolver a confirmação real do pagamento.</p></div>
  ${rows.length?`<div class="admin-table bump-metrics-table"><table><thead><tr><th>Order bump</th><th>Impressões</th><th>Aceites</th><th>Taxa de aceite</th><th>Avanços</th><th>Valor potencial</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.b.internalName||x.b.title)}</strong></td><td>${x.imp}</td><td>${x.acc}</td><td>${x.rate.toFixed(1)}%</td><td>${x.sub}</td><td>${money(x.value)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">Cadastre um order bump para começar a gerar métricas.</div>`}`,'metricas');
}
function collectOrderBumpEditor(){
 const form=document.querySelector('#orderBumpForm');
 const base={...(state.orderBumpEditing||blankOrderBump())};
 if(!form)return base;
 const fd=new FormData(form);
 base.internalName=String(fd.get('bump.internalName')||'').trim();
 base.title=String(fd.get('bump.title')||'').trim();
 base.description=String(fd.get('bump.description')||'').trim();
 base.productId=String(fd.get('bump.productId')||'');
 base.triggerProductId=String(fd.get('bump.triggerProductId')||'');
 base.imageUrl=String(fd.get('bump.imageUrl')||'').trim();
 base.badge=String(fd.get('bump.badge')||'').trim();
 base.checkboxLabel=String(fd.get('bump.checkboxLabel')||'').trim();
 base.priceCents=Math.max(0,Math.round(Number(fd.get('bump.priceReais')||0)*100));
 const compare=String(fd.get('bump.compareAtReais')||'').trim();
 base.compareAtCents=compare===''?null:Math.max(0,Math.round(Number(compare)*100));
 base.maxQty=Math.max(1,Math.min(10,Number(fd.get('bump.maxQty')||1)));
 base.sortOrder=Number(fd.get('bump.sortOrder')||999);
 base.isActive=String(fd.get('bump.isActive'))==='true';
 delete base.__new;
 return base;
}

function adminProducts(){const rows=state.products.sort((a,b)=>a.sortOrder-b.sortOrder);return adminShell(`<div class="admin-toolbar"><div><h1 style="margin:0;color:var(--navy)">Produtos</h1><p style="color:var(--muted)">Edite todo o conteúdo da PDP. O que ficar vazio não aparece no site.</p><small style="display:block;margin-top:6px;color:var(--muted)">Os produtos são salvos no Supabase e ficam disponíveis para todos os visitantes. "Exportar catálogo" continua disponível como backup adicional.</small></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn btn-secondary" id="exportCatalog">Exportar catálogo</button><button class="btn btn-secondary" id="importCatalog">Importar catálogo</button><input id="importCatalogFile" type="file" accept="application/json,.json" hidden><button class="btn btn-primary" id="newProduct">+ Novo produto</button></div></div>${state.adminEditing?editor(state.adminEditing):`<div class="admin-table"><table><thead><tr><th>Produto</th><th>Marca</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${esc(p.displayName)}</strong><br><small>${esc(p.slug)}</small></td><td>${esc(p.brand||'—')}</td><td>${money(p.pricing.basic)}</td><td><span class="status ${p.isActive?'on':'off'}">${p.isActive?'ATIVO':'ARQUIVADO'}</span></td><td><button class="btn btn-secondary" data-edit="${esc(p.id)}">Editar</button> <button class="btn ${p.isActive?'btn-danger':'btn-soft'}" data-toggle="${esc(p.id)}">${p.isActive?'Arquivar':'Restaurar'}</button></td></tr>`).join('')}</tbody></table></div>`}`,'produtos')}

const field=(label,name,value='',type='text',extra='')=>`<div class="field ${extra}"><label>${label}</label><input class="input" type="${type}" name="${name}" value="${esc(value)}"></div>`;
const area=(label,name,value='',extra='')=>`<div class="field ${extra}"><label>${label}</label><textarea class="textarea" name="${name}">${esc(value)}</textarea></div>`;
const jsonArea=(label,name,value,extra='full')=>`<div class="field ${extra}"><label>${label}</label><textarea class="textarea" data-json="true" name="${name}">${esc(JSON.stringify(value??[],null,2))}</textarea><small>Editor avançado em JSON para listas e estruturas aninhadas.</small></div>`;
function editor(p){const tab=state.adminTab;const tabs=[['geral','Geral'],['preco','Preço & Entrega'],['midia','Mídia'],['seguranca','Segurança'],['regulatorio','Regulatório'],['documentacao','Documentação'],['fontes','Fontes'],['faq','FAQ & Avaliações'],['conteudo','Textos da PDP'],['seo','SEO & Visibilidade']];return `<div class="editor"><div class="admin-toolbar"><div><h2 style="margin:0;color:var(--navy)">${p.__new?'Novo produto':'Editar produto'}</h2><p style="margin:4px 0;color:var(--muted)">${esc(p.displayName||p.name||'')}</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" id="cancelEdit">Cancelar</button>${!p.__new&&p.slug?`<a class="btn btn-secondary" href="/produto/${esc(p.slug)}" data-route>Ver no site</a>`:''}<button class="btn btn-primary" id="saveProduct">Salvar alterações</button></div></div><div class="completion"><strong>Regra do editor:</strong> campos vazios são permitidos. Blocos vazios ou ocultos não aparecem na página pública.</div><div class="tabs">${tabs.map(([id,l])=>`<button class="tab ${tab===id?'active':''}" data-tab="${id}">${l}</button>`).join('')}</div><form id="productEditorForm">${editorPanel(p,tab)}</form></div>`}
function editorPanel(p,t){if(t==='geral')return `<div class="editor-grid">${field('Nome','name',p.name)}${field('Nome de exibição','displayName',p.displayName)}${field('Slug','slug',p.slug)}${field('Marca','brand',p.brand)}${area('Descrição da marca','brandDescription',p.brandDescription,'full')}${field('Categoria','category',p.category)}${field('Dosagem','dosageFromUser',p.dosageFromUser)}${field('Apresentação','presentationFromUser',p.presentationFromUser)}${field('Variante','variantFromUser',p.variantFromUser)}${field('Princípio ativo','activeIngredient',p.activeIngredient)}${field('Concentração','concentration',p.concentration)}${field('Via de administração','administration',p.administration)}${field('Origem','origin',p.origin)}${field('Formato','format',p.format)}${area('Descrição curta','shortDescription',p.shortDescription,'full')}${area('Descrição completa','fullDescription',p.fullDescription,'full')}${field('URL oficial da marca','officialBrandUrl',p.officialBrandUrl,'url')}${field('Ordem na vitrine','sortOrder',p.sortOrder,'number')}<div class="field"><label>Status</label><select class="select" name="isActive"><option value="true" ${p.isActive?'selected':''}>Ativo</option><option value="false" ${!p.isActive?'selected':''}>Arquivado</option></select></div></div>`;
if(t==='preco')return `<div class="editor-grid">${field('Preço básico (R$)','pricing.basic',p.pricing.basic,'number')}${field('Preço express (R$)','pricing.express',p.pricing.express,'number')}${field('Preço promocional (centavos)','promoPriceCents',p.promoPriceCents??'','number')}${field('Prazo básico','basicEta',p.basicEta)}${field('Prazo express','expressEta',p.expressEta)}${field('Frete (centavos)','shippingFeeCents',p.shippingFeeCents??'','number')}<div class="field"><label>Entrega expressa</label><select class="select" name="expressAvailable"><option value="true" ${p.expressAvailable?'selected':''}>Ativada</option><option value="false" ${!p.expressAvailable?'selected':''}>Desativada</option></select></div><div class="field"><label>Refrigeração</label><select class="select" name="requiresRefrigeration"><option value="false" ${!p.requiresRefrigeration?'selected':''}>Não</option><option value="true" ${p.requiresRefrigeration?'selected':''}>Sim</option></select></div>${field('Faixa de temperatura','temperatureRange',p.temperatureRange)}${area('Observação de conservação no envio','deliveryStorageNote',p.deliveryStorageNote,'full')}</div>`;
if(t==='midia')return repeatEditor('media',p.media,[['label','Rótulo'],['alt','Texto alternativo'],['src','URL da imagem']]);
if(t==='seguranca')return `<div class="editor-grid">${area('Armazenamento','storage',p.storage,'full')}${area('Aviso de congelamento','freezeWarning',p.freezeWarning,'full')}${area('Aviso de luz','lightWarning',p.lightWarning,'full')}${area('Contraindicação principal','mainContraindication',p.mainContraindication,'full')}${area('Aviso para crianças','childrenWarning',p.childrenWarning,'full')}<div class="field"><label>Exige prescrição</label><select class="select" name="prescriptionRequired"><option value="false" ${!p.prescriptionRequired?'selected':''}>Não / não informado</option><option value="true" ${p.prescriptionRequired?'selected':''}>Sim</option></select></div><div class="full subcard"><h4>Avisos importantes</h4>${arrayStringEditor('importantWarnings',p.importantWarnings)}</div><div class="full subcard"><h4>Bloco estruturado de segurança</h4>${area('Prescrição','safety.prescription',p.safety?.prescription||'')}${area('Armazenamento','safety.storage',p.safety?.storage||'')}${area('Segurança','safety.safety',p.safety?.safety||'')}${area('Orientação geral','safety.general',p.safety?.general||'')}<h4>Itens do modal</h4>${repeatEditorInner('safety.modal',p.safety?.modal||[],[['title','Título'],['text','Texto']])}</div></div>`;
if(t==='regulatorio'){const r=p.regulatory||{};return `<div class="editor-grid">${field('Autoridade','regulatory.authority',r.authority||'')}${field('Registro','regulatory.registration',r.registration||'')}${field('Nome comercial','regulatory.commercialName',r.commercialName||'')}${field('Nome genérico','regulatory.genericName',r.genericName||'')}${field('RUC','regulatory.ruc',r.ruc||'')}${field('Rótulo do ID empresarial','regulatory.businessIdLabel',r.businessIdLabel||'')}${field('ID empresarial','regulatory.businessId',r.businessId||'')}${field('Validade','regulatory.validUntil',r.validUntil||'')}${field('Fabricante','regulatory.manufacturer',r.manufacturer||'')}${area('Descrição do fabricante','regulatory.manufacturerDescription',r.manufacturerDescription||'','full')}${field('Origem','regulatory.origin',r.origin||'')}${field('Processo','regulatory.processNumber',r.processNumber||'')}${field('Categoria','regulatory.category',r.category||'')}${field('Registro inicial','regulatory.initialRegistrationDate',r.initialRegistrationDate||'')}${field('AFE / autorização','regulatory.afe',r.afe||'')}${field('Titular','regulatory.holder',r.holder||'')}${area('Endereço do titular','regulatory.holderAddress',r.holderAddress||'','full')}${field('Situação','regulatory.status',r.status||'')}${field('Validade das apresentações','regulatory.registeredPresentationsValidity',r.registeredPresentationsValidity||'')}${area('Nota regulatória','regulatory.note',r.note||'','full')}${field('Título locais de fabricação','regulatory.manufacturingSitesTitle',r.manufacturingSitesTitle||'')}<div class="full subcard"><h4>Locais de fabricação</h4>${repeatEditorInner('regulatory.manufacturingSites',r.manufacturingSites||[],[['name','Nome'],['location','Localização'],['note','Nota']])}</div><div class="full subcard"><h4>Histórico regulatório</h4>${repeatEditorInner('regulatory.regulatoryHistory',r.regulatoryHistory||[],[['date','Data'],['text','Descrição']])}</div><div class="full subcard"><h4>Rastreabilidade</h4>${field('Título','regulatory.traceabilityNote.title',r.traceabilityNote?.title||'')}${area('Texto','regulatory.traceabilityNote.text',r.traceabilityNote?.text||'')}${arrayStringEditor('regulatory.traceabilityNote.items',r.traceabilityNote?.items||[])}</div>${area('Observações regulatórias extras','regulatoryNotes',p.regulatoryNotes,'full')}${field('URL do documento oficial','officialDocumentUrl',p.officialDocumentUrl,'url')}</div>`}
if(t==='documentacao'){const d=p.documentation||{};return `<div class="editor-grid">${area('Resumo','documentation.summary',d.summary||'','full')}${area('Destaque','documentation.highlight',d.highlight||'','full')}${field('Headline','documentation.headline',d.headline||'')}${area('Introdução','documentation.intro',d.intro||'','full')}${field('Título dos métodos','documentation.methodsTitle',d.methodsTitle||'')}<div class="full subcard"><h4>Métodos</h4>${repeatEditorInner('documentation.methods',d.methods||[],[['name','Nome'],['description','Descrição']])}</div>${area('Conclusão','documentation.conclusion',d.conclusion||'','full')}${area('Microcopy','documentation.microcopy',d.microcopy||'','full')}<div class="full subcard"><h4>Seções adicionais</h4>${jsonArea('Estrutura completa das seções','documentation.sections',d.sections||[])}</div><div class="full subcard"><h4>Documentos</h4>${repeatEditorInner('documents',p.documents||[],[['documentType','Tipo'],['documentDate','Data'],['origin','Origem'],['pdfUrl','URL do PDF']])}</div></div>`}
if(t==='fontes')return `<div class="editor-grid">${area('Introdução das fontes','sourcesIntro',p.sourcesIntro,'full')}${area('Observação das fontes','sourcesNote',p.sourcesNote,'full')}<div class="full subcard"><h4>Links e fontes</h4>${repeatEditorInner('sourceLinks',p.sourceLinks||[],[['label','Rótulo'],['buttonLabel','Texto do botão'],['url','URL'],['pendingLabel','Texto legado (não exibido como pendência)']])}</div></div>`;
if(t==='faq')return `<div class="editor-grid"><div class="full subcard"><h4>FAQ</h4>${repeatEditorInner('faqs',p.faqs||[],[['q','Pergunta'],['a','Resposta']])}</div><div class="full subcard"><h4>Avaliações</h4>${repeatEditorInner('reviews',p.reviews||[],[['author','Autor'],['topic','Assunto'],['text','Texto'],['date','Data']])}</div></div>`;
if(t==='conteudo'){const c=p.pdpContent||{};return `<div class="editor-grid">${field('Fallback de categoria','pdpContent.categoryFallback',c.categoryFallback||'Produto')}${field('Selo documentação','pdpContent.chipDocumentation',c.chipDocumentation||'Documentação disponível')}${field('Selo conservação','pdpContent.chipConservation',c.chipConservation||'Conservação informada')}${field('Rótulo entrega básica','pdpContent.basicDeliveryLabel',c.basicDeliveryLabel||'Entrega Básica')}${field('Rótulo entrega expressa','pdpContent.expressDeliveryLabel',c.expressDeliveryLabel||'Entrega Expressa')}${field('CTA comprar agora','pdpContent.buyNowLabel',c.buyNowLabel||'COMPRAR AGORA')}${field('CTA adicionar ao carrinho','pdpContent.addToCartLabel',c.addToCartLabel||'Adicionar ao carrinho')}${field('Confiança: procedência','pdpContent.trustOrigin',c.trustOrigin||'Procedência')}${field('Confiança: documentação','pdpContent.trustDocumentation',c.trustDocumentation||'Documentação')}${field('Confiança: entrega','pdpContent.trustDelivery',c.trustDelivery||'Entrega')}${field('Confiança: conservação','pdpContent.trustConservation',c.trustConservation||'Conservação')}${field('Título: sobre o produto','pdpContent.aboutTitle',c.aboutTitle||'Sobre o produto')}${field('Título: ficha técnica','pdpContent.specsTitle',c.specsTitle||'Ficha técnica')}${field('Título: entrega e conservação','pdpContent.deliveryTitle',c.deliveryTitle||'Entrega e conservação')}${field('Título: segurança','pdpContent.safetyTitle',c.safetyTitle||'Segurança e conservação')}${field('Título: regulamentação','pdpContent.regulatoryTitle',c.regulatoryTitle||'Regulamentação')}${field('Título: documentação','pdpContent.documentationTitle',c.documentationTitle||'Documentação')}${field('Título: fontes','pdpContent.sourcesTitle',c.sourcesTitle||'Fontes')}${field('Título: FAQ','pdpContent.faqTitle',c.faqTitle||'Perguntas frequentes')}${field('Título: avaliações','pdpContent.reviewsTitle',c.reviewsTitle||'Experiência de compra')}${field('Título: relacionados','pdpContent.relatedTitle',c.relatedTitle||'Também disponíveis')}${field('Rótulo preço inicial','pdpContent.fromPriceLabel',c.fromPriceLabel||'A partir de')}${field('Botão documento oficial','pdpContent.officialDocumentLabel',c.officialDocumentLabel||'DOCUMENTO OFICIAL')}${field('Rótulo documento padrão','pdpContent.defaultDocumentLabel',c.defaultDocumentLabel||'Documento')}${field('CTA abrir documento','pdpContent.openDocumentLabel',c.openDocumentLabel||'Abrir documento')}${field('Rótulo fonte padrão','pdpContent.defaultSourceLabel',c.defaultSourceLabel||'Fonte')}${field('CTA fonte padrão','pdpContent.defaultSourceButton',c.defaultSourceButton||'Acessar fonte')}${field('Título do box da marca (opcional)','pdpContent.brandBoxTitle',c.brandBoxTitle||'')}</div>`}
if(t==='seo')return `<div class="editor-grid">${field('Título SEO','seoTitle',p.seoTitle)}${area('Descrição SEO','seoDescription',p.seoDescription,'full')}<div class="full subcard"><h4>Visibilidade dos blocos</h4>${SECTION_KEYS.map(([k,l])=>`<label class="toggle-row"><span><strong>${esc(l)}</strong><br><small>Desligar preserva os dados, mas oculta o bloco público.</small></span><input type="checkbox" name="visibility.${k}" ${isVisible(p,k)?'checked':''}></label>`).join('')}</div></div>`;return ''}
function repeatEditor(key,arr,fields){return `<div class="subcard"><h4>Itens de mídia</h4>${repeatEditorInner(key,arr,fields)}</div>`}
function repeatEditorInner(key,arr,fields){return `<div data-repeat-root="${key}">${arr.map((item,i)=>`<div class="repeat-row" data-repeat-index="${i}">${fields.map(([f,l])=>field(l,`${key}.${i}.${f}`,item?.[f]||'')).join('')}<div class="row-actions"><button class="btn btn-secondary" type="button" data-move-up="${key}:${i}">↑</button><button class="btn btn-secondary" type="button" data-move-down="${key}:${i}">↓</button><button class="btn btn-danger" type="button" data-remove-repeat="${key}:${i}">Remover</button></div></div>`).join('')}<button class="btn btn-soft" type="button" data-add-repeat="${key}">+ Adicionar item</button></div>`}
function arrayStringEditor(key,arr){return `<div data-string-root="${key}">${(arr||[]).map((v,i)=>`<div class="repeat-row"><input class="input" name="${key}.${i}" value="${esc(v)}"><div class="row-actions"><button class="btn btn-danger" type="button" data-remove-string="${key}:${i}">Remover</button></div></div>`).join('')}<button class="btn btn-soft" type="button" data-add-string="${key}">+ Adicionar</button></div>`}

function getByPath(obj,path){return path.split('.').reduce((a,k)=>a?.[k],obj)}
function setByPath(obj,path,value){const parts=path.split('.');let cur=obj;parts.forEach((k,i)=>{const last=i===parts.length-1;if(last){cur[k]=value;return}const next=parts[i+1];if(cur[k]==null)cur[k]=/^\d+$/.test(next)?[]:{};cur=cur[k]})}
function collectEditor(){const p=structuredClone(state.adminEditing);const form=document.querySelector('#productEditorForm');if(!form)return p;form.querySelectorAll('[name]').forEach(el=>{const name=el.name;if(name.startsWith('visibility.')){const k=name.split('.')[1];p.sectionVisibility=p.sectionVisibility||{};p.sectionVisibility[k]=el.checked;return}let val=el.value;if(el.dataset.json==='true'){try{val=val.trim()?JSON.parse(val):[]}catch{toast('Há um campo JSON inválido.');throw new Error('JSON inválido em '+name)}}if(el.type==='number')val=val===''?null:Number(val);if(['isActive','expressAvailable','requiresRefrigeration','prescriptionRequired'].includes(name))val=val==='true';setByPath(p,name,val)});p.slug=slugify(p.slug||p.name);p.displayName=p.displayName||p.name;return normalizeProduct(p)}

function render(){const path=location.pathname;let html;if(path==='/')html=home();else if(path==='/produtos')html=productsPage();else if(path.startsWith('/produto/'))html=pdp(decodeURIComponent(path.split('/')[2]||''));else if(path==='/checkout')html=checkout();else if(path==='/admin')html=(state.isAdmin&&!state.mustChangePassword)?adminOverview():adminAccess();else if(path==='/admin/produtos')html=(state.isAdmin&&!state.mustChangePassword)?adminProducts():adminAccess();else if(path==='/admin/order-bumps')html=(state.isAdmin&&!state.mustChangePassword)?adminOrderBumps():adminAccess();else if(path==='/admin/order-bumps/metricas')html=(state.isAdmin&&!state.mustChangePassword)?orderBumpMetrics():adminAccess();else if(path==='/entrega')html=expressDeliveryPage();else if(path==='/transparencia')html=transparencyPage();else if(path==='/rastreamento')html=genericPage('Rastreamento','Área preparada para consulta de pedidos e acompanhamento logístico.');else if(path==='/contato')html=genericPage('Contato','Canal de atendimento da Global Pharma.');else if(path==='/ajuda')html=genericPage('Ajuda','Central de suporte e dúvidas frequentes.');else if(path==='/termos')html=genericPage('Termos de uso','Conteúdo jurídico será conectado à versão definitiva.');else if(path==='/privacidade')html=genericPage('Privacidade','Política de privacidade será conectada à versão definitiva.');else if(path==='/trocas-e-devolucoes')html=genericPage('Trocas e devoluções','Política operacional será conectada à versão definitiva.');else html=genericPage('Página não encontrada','O endereço solicitado não existe.');app.innerHTML=html;bind();}

function bind(){
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{addToCart(b.dataset.buy);goto('/checkout')});
 document.querySelectorAll('[data-shipping]').forEach(el=>el.onchange=()=>{state.selectedShipping=el.dataset.shipping;render()});
 document.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>{state.galleryIndex=Number(b.dataset.thumb||0);render()});
 document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{state.heroIndex=(state.heroIndex+(b.dataset.hero==='next'?1:2))%3;render()});
 document.querySelectorAll('[data-hero-index]').forEach(b=>b.onclick=()=>{state.heroIndex=Number(b.dataset.heroIndex||0);render()});
 const mt=document.querySelector('#mobileToggle');if(mt)mt.onclick=()=>{const menu=document.querySelector('#mobileMenu');const open=!menu?.classList.contains('open');menu?.classList.toggle('open',open);mt.classList.toggle('open',open);mt.setAttribute('aria-expanded',String(open));mt.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')};
 const surface=document.querySelector('#headerSurface');if(headerScrollHandler)window.removeEventListener('scroll',headerScrollHandler);if(surface){headerScrollHandler=()=>surface.classList.toggle('scrolled',window.scrollY>8);headerScrollHandler();window.addEventListener('scroll',headerScrollHandler,{passive:true})}
 const openCart=document.querySelector('#cartOpen');if(openCart)openCart.onclick=()=>{state.cartOpen=true;render()};const closeCart=()=>{state.cartOpen=false;render()};document.querySelector('#cartClose')?.addEventListener('click',closeCart);document.querySelector('#cartBackdrop')?.addEventListener('click',closeCart);document.querySelector('#cartContinue')?.addEventListener('click',closeCart);document.querySelectorAll('[data-cart-inc]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartInc);if(state.cart[i]){state.cart[i].qty++;saveCart();render()}});document.querySelectorAll('[data-cart-dec]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartDec);if(state.cart[i]){state.cart[i].qty--;if(state.cart[i].qty<=0)state.cart.splice(i,1);saveCart();render()}});document.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartRemove);if(state.cart[i]){state.cart.splice(i,1);saveCart();render();toast('Produto removido do carrinho.')}});document.body.classList.toggle('cart-is-open',state.cartOpen);
 const filter=(input,grid,source)=>{if(!input||!grid)return;input.oninput=()=>{const q=input.value.toLowerCase().trim();grid.innerHTML=source().filter(p=>[p.name,p.displayName,p.brand,p.category,p.presentationFromUser,p.variantFromUser].join(' ').toLowerCase().includes(q)).map(productCard).join('')}};
 filter(document.querySelector('#catalogSearch'),document.querySelector('#catalogGrid'),()=>state.products.filter(p=>p.isActive));
 filter(document.querySelector('#homeProductSearch'),document.querySelector('#homeProductGrid'),()=>state.products.filter(p=>p.isActive));
 const bindHeaderSearch=(el)=>{if(!el)return;const box=el.closest('[data-search-box]');const dropdown=box?.querySelector('.search-dropdown');const form=el.closest('form');let active=-1;const products=()=>state.products.filter(p=>p.isActive);const close=()=>{if(dropdown){dropdown.hidden=true;dropdown.innerHTML=''}el.setAttribute('aria-expanded','false');active=-1};const results=()=>{const q=el.value.trim().toLowerCase();if(!q)return[];return products().filter(p=>[p.name,p.displayName,p.brand,p.category,p.presentationFromUser,p.variantFromUser].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,8)};const draw=()=>{if(!dropdown)return;const list=results();if(!el.value.trim()){close();return}dropdown.hidden=false;el.setAttribute('aria-expanded','true');dropdown.innerHTML=list.length?list.map((p,i)=>{const pres=p.presentationFromUser||[p.concentration,p.format].filter(has).join(' • ');return `<button type="button" class="search-result ${i===active?'active':''}" role="option" data-search-slug="${esc(p.slug)}"><span>${esc(p.name)}</span>${pres?`<small>${esc(pres)}</small>`:''}</button>`}).join(''):`<p class="search-empty">Nenhum produto encontrado.</p>`;dropdown.querySelectorAll('[data-search-slug]').forEach(b=>b.onclick=()=>goto('/produto/'+b.dataset.searchSlug))};el.addEventListener('input',()=>{active=-1;draw()});el.addEventListener('focus',draw);el.addEventListener('blur',()=>setTimeout(close,150));el.addEventListener('keydown',e=>{const list=results();if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(active+1,list.length-1);draw()}else if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(active-1,0);draw()}else if(e.key==='Escape'){close()}else if(e.key==='Enter'){e.preventDefault();const p=list[active]||list[0];if(p)goto('/produto/'+p.slug);else goto('/produtos')}});form?.addEventListener('submit',e=>e.preventDefault())};
 bindHeaderSearch(document.querySelector('#headerSearch'));bindHeaderSearch(document.querySelector('#mobileHeaderSearch'));
 document.querySelectorAll('[data-payment-method]').forEach(b=>b.onclick=()=>{state.checkoutPaymentMethod=b.dataset.paymentMethod||'pix';render()});
 const checkoutItems=state.cart.map(i=>({i,p:state.products.find(p=>p.slug===i.slug)})).filter(x=>x.p);
 const checkoutBumps=location.pathname==='/checkout'?eligibleOrderBumps(checkoutItems):[];
 if(location.pathname==='/checkout'){checkoutBumps.forEach(b=>recordOrderBumpEvent(b.id,state.checkoutSessionId,'impression',b.priceCents).catch(err=>console.error('Falha ao registrar impressão do bump',err)))}
 document.querySelectorAll('[data-order-bump]').forEach(input=>input.onchange=async()=>{const id=input.dataset.orderBump;const bump=state.orderBumps.find(b=>b.id===id);if(!bump)return;const selected=new Set(state.selectedBumpIds);if(input.checked){selected.add(id);try{await recordOrderBumpEvent(id,state.checkoutSessionId,'accept',bump.priceCents)}catch(err){console.error(err)}}else{selected.delete(id);try{await recordOrderBumpEvent(id,state.checkoutSessionId,'remove',bump.priceCents)}catch(err){console.error(err)}}state.selectedBumpIds=[...selected];saveBumpSelections();render()});
 const cf=document.querySelector('#checkoutForm');if(cf)cf.onsubmit=async e=>{e.preventDefault();const selected=checkoutBumps.filter(b=>state.selectedBumpIds.includes(b.id));await Promise.all(selected.map(b=>recordOrderBumpEvent(b.id,state.checkoutSessionId,'checkout_submit',b.priceCents).catch(err=>console.error(err))));const fd=new FormData(cf);const itemPayload=checkoutItems.map(({i,p})=>({productId:p.id,slug:p.slug,name:p.displayName||p.name,qty:i.qty,shipping:i.shipping,unitPriceCents:Math.round((i.shipping==='express'&&p.expressAvailable?p.pricing.express:p.pricing.basic)*100)}));const bumpPayload=selected.map(b=>({orderBumpId:b.id,productId:b.productId||null,title:b.title,qty:1,unitPriceCents:b.priceCents}));const totalCents=itemPayload.reduce((sum,x)=>sum+x.unitPriceCents*x.qty,0)+bumpPayload.reduce((sum,x)=>sum+x.unitPriceCents*x.qty,0);try{const result=await createCheckoutPayment({sessionId:state.checkoutSessionId,paymentMethod:state.checkoutPaymentMethod,customer:{name:String(fd.get('name')||''),document:String(fd.get('document')||''),email:String(fd.get('email')||''),phone:String(fd.get('phone')||'')},address:{postal:String(fd.get('postal')||''),city:String(fd.get('city')||''),state:String(fd.get('state')||''),number:String(fd.get('number')||''),address:String(fd.get('address')||''),complement:String(fd.get('complement')||'')},items:itemPayload,orderBumps:bumpPayload,totalCents});if(result.status==='unconfigured')toast('Checkout pronto. Falta configurar o gateway para gerar a cobrança real.');else toast('Pagamento iniciado com sucesso.')}catch(err){console.error(err);toast('Não foi possível iniciar o pagamento.')}};
 const login=document.querySelector('#adminLoginForm');if(login)login.onsubmit=async e=>{e.preventDefault();const fd=new FormData(login);try{await signInAdmin(String(fd.get('password')||''));await refreshAuth();await refreshCloudProducts();render();toast(state.mustChangePassword?'Login realizado. Atualize sua senha para continuar.':'Login realizado.')}catch(err){console.error(err);toast('Senha inválida.')}};
 const passwordForm=document.querySelector('#adminPasswordForm');if(passwordForm)passwordForm.onsubmit=async e=>{e.preventDefault();const fd=new FormData(passwordForm);const password=String(fd.get('password')||'');const confirmPassword=String(fd.get('confirm')||'');if(password.length<10){toast('Use uma senha com pelo menos 10 caracteres.');return}if(password!==confirmPassword){toast('As senhas não coincidem.');return}try{await updateAdminPassword(password);await refreshAuth();render();toast('Senha atualizada. Painel liberado.')}catch(err){console.error(err);toast('Não foi possível atualizar a senha.')}};
 const logout=document.querySelector('#adminLogout');if(logout)logout.onclick=async()=>{try{await signOutAdmin();state.authUser=null;state.isAdmin=false;state.mustChangePassword=false;state.adminEditing=null;await refreshCloudProducts();render();toast('Sessão encerrada.')}catch(err){console.error(err);toast('Não foi possível sair agora.')}};
 const exportBtn=document.querySelector('#exportCatalog');if(exportBtn)exportBtn.onclick=()=>{const payload={version:1,exportedAt:new Date().toISOString(),products:state.products};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`global-pharma-catalogo-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Backup do catálogo exportado.')};
 const importBtn=document.querySelector('#importCatalog');const importFile=document.querySelector('#importCatalogFile');if(importBtn&&importFile){importBtn.onclick=()=>importFile.click();importFile.onchange=async()=>{const file=importFile.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());const items=Array.isArray(parsed)?parsed:parsed.products;if(!Array.isArray(items))throw new Error('Formato inválido');if(!confirm(`Importar ${items.length} produtos e substituir o catálogo online?`))return;const normalized=items.map(normalizeProduct);await replaceCloudProducts(normalized);await refreshCloudProducts();state.adminEditing=null;render();toast('Catálogo importado e sincronizado com sucesso.')}catch{toast('Arquivo de catálogo inválido.')}finally{importFile.value=''}}}
 const newBump=document.querySelector('#newOrderBump');if(newBump)newBump.onclick=()=>{state.orderBumpEditing=blankOrderBump();render()};
 document.querySelectorAll('[data-edit-bump]').forEach(b=>b.onclick=()=>{const bump=state.orderBumps.find(x=>x.id===b.dataset.editBump);if(bump){state.orderBumpEditing=structuredClone(bump);render()}});
 document.querySelectorAll('[data-toggle-bump]').forEach(b=>b.onclick=async()=>{const bump=state.orderBumps.find(x=>x.id===b.dataset.toggleBump);if(!bump)return;try{await upsertOrderBump({...bump,isActive:!bump.isActive});await refreshOrderBumps();render();toast(bump.isActive?'Order bump arquivado.':'Order bump restaurado.')}catch(err){console.error(err);toast('Não foi possível atualizar o order bump.')}});
 const cancelBump=document.querySelector('#cancelBumpEdit');if(cancelBump)cancelBump.onclick=()=>{state.orderBumpEditing=null;render()};
 const saveBump=document.querySelector('#saveOrderBump');if(saveBump)saveBump.onclick=async()=>{try{const bump=collectOrderBumpEditor();if(!bump.internalName||!bump.title){toast('Informe o nome interno e o título da oferta.');return}if(bump.priceCents<=0){toast('Informe um preço válido para o order bump.');return}saveBump.disabled=true;saveBump.textContent='Salvando...';await upsertOrderBump(bump);state.orderBumpEditing=null;await refreshOrderBumps();await refreshOrderBumpMetrics();render();toast('Order bump salvo.')}catch(err){console.error(err);toast('Não foi possível salvar o order bump.')}};
 const refreshBumpMetrics=document.querySelector('#refreshBumpMetrics');if(refreshBumpMetrics)refreshBumpMetrics.onclick=async()=>{refreshBumpMetrics.disabled=true;await refreshOrderBumpMetrics();render();toast('Métricas atualizadas.')};
 const np=document.querySelector('#newProduct');if(np)np.onclick=()=>{state.adminEditing=normalizeProduct({__new:true,slug:'',name:'',displayName:'',pricing:{basic:0,express:0},expressAvailable:false,isActive:true,media:[],documents:[],sourceLinks:[],reviews:[],faqs:[],importantWarnings:[],sectionVisibility:{}});state.adminEditing.__new=true;state.adminTab='geral';render()};
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{state.adminEditing=structuredClone(state.products.find(p=>p.id===b.dataset.edit));state.adminTab='geral';render()});
 document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const p=state.products.find(p=>p.id===b.dataset.toggle);if(p){const previous=p.isActive;p.isActive=!p.isActive;try{await upsertCloudProduct(p);await refreshCloudProducts();render();toast(p.isActive?'Produto restaurado':'Produto arquivado')}catch(err){console.error(err);p.isActive=previous;toast('Não foi possível atualizar o produto.')}}});
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=e=>{e.preventDefault();state.adminEditing=collectEditor();state.adminTab=b.dataset.tab;render()});
 const cancel=document.querySelector('#cancelEdit');if(cancel)cancel.onclick=()=>{if(confirm('Cancelar edição? Alterações ainda não salvas serão descartadas.')){state.adminEditing=null;render()}};
 const save=document.querySelector('#saveProduct');if(save)save.onclick=async()=>{const p=collectEditor();if(!p.name.trim()){toast('Informe o nome do produto.');return}try{save.disabled=true;save.textContent='Salvando...';await upsertCloudProduct(p);await refreshCloudProducts();state.adminEditing=null;render();toast('Produto salvo e publicado no site.')}catch(err){console.error(err);save.disabled=false;save.textContent='Salvar alterações';toast('Não foi possível salvar o produto.')}};
 bindRepeaters();
}
function ensureRepeat(key){let arr=getByPath(state.adminEditing,key);if(!Array.isArray(arr)){arr=[];setByPath(state.adminEditing,key,arr)}return arr}
function blankItemFor(key){if(key==='media')return{id:uid(),label:'',alt:'',src:''};if(key==='documents')return{id:uid(),documentType:'',documentDate:'',origin:'',pdfUrl:''};if(key==='sourceLinks')return{id:uid(),label:'',buttonLabel:'',url:'',pendingLabel:''};if(key==='faqs')return{q:'',a:''};if(key==='reviews')return{id:uid(),author:'',topic:'',text:'',date:''};if(key==='safety.modal')return{id:uid(),title:'',text:''};if(key==='regulatory.manufacturingSites')return{id:uid(),name:'',location:'',note:''};if(key==='regulatory.regulatoryHistory')return{id:uid(),date:'',text:''};if(key==='documentation.methods')return{id:uid(),name:'',description:''};if(key==='documentation.sections')return{id:uid(),title:'',text:'',tone:'default',items:[],rows:[]};return{id:uid()}}
function bindRepeaters(){document.querySelectorAll('[data-add-repeat]').forEach(b=>b.onclick=()=>{state.adminEditing=collectEditor();ensureRepeat(b.dataset.addRepeat).push(blankItemFor(b.dataset.addRepeat));render()});document.querySelectorAll('[data-remove-repeat]').forEach(b=>b.onclick=()=>{state.adminEditing=collectEditor();const[k,i]=b.dataset.removeRepeat.split(':');ensureRepeat(k).splice(Number(i),1);render()});document.querySelectorAll('[data-move-up]').forEach(b=>b.onclick=()=>{state.adminEditing=collectEditor();const[k,i0]=b.dataset.moveUp.split(':');const i=Number(i0),arr=ensureRepeat(k);if(i>0)[arr[i-1],arr[i]]=[arr[i],arr[i-1]];render()});document.querySelectorAll('[data-move-down]').forEach(b=>b.onclick=()=>{state.adminEditing=collectEditor();const[k,i0]=b.dataset.moveDown.split(':');const i=Number(i0),arr=ensureRepeat(k);if(i<arr.length-1)[arr[i+1],arr[i]]=[arr[i],arr[i+1]];render()});document.querySelectorAll('[data-add-string]').forEach(b=>b.onclick=()=>{state.adminEditing=collectEditor();ensureRepeat(b.dataset.addString).push('');render()});document.querySelectorAll('[data-remove-string]').forEach(b=>b.onclick=()=>{state.adminEditing=collectEditor();const[k,i]=b.dataset.removeString.split(':');ensureRepeat(k).splice(Number(i),1);render()})}
function addToCart(slug){const p=state.products.find(p=>p.slug===slug);if(!p)return;const shipping=state.selectedShipping==='express'&&p.expressAvailable?'express':'basic';const line=state.cart.find(i=>i.slug===slug&&i.shipping===shipping);if(line)line.qty++;else state.cart.push({slug,shipping,qty:1});saveCart();render();toast('Produto adicionado ao carrinho.')}

async function initApp(){
  await refreshAuth();
  await refreshCloudProducts();
  await refreshOrderBumps();
  if(state.isAdmin&&!state.mustChangePassword)await refreshOrderBumpMetrics();
  render();
  onAuthChange(async auth=>{
    const changed=(state.authUser?.id||null)!==(auth.user?.id||null)||state.isAdmin!==auth.isAdmin;
    state.authUser=auth.user;
    state.isAdmin=auth.isAdmin;
    state.mustChangePassword=auth.mustChangePassword;
    if(changed){await refreshCloudProducts();await refreshOrderBumps();if(state.isAdmin&&!state.mustChangePassword)await refreshOrderBumpMetrics();render();}
  });
}
initApp();