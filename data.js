export const SECTION_KEYS = [
  ['trustStrip','Faixa de confiança'],['description','Descrição do produto'],['specs','Ficha técnica'],['reviews','Avaliações'],['delivery','Entrega e conservação'],['safety','Segurança'],['documentation','Documentação'],['regulatory','Regulatório'],['sources','Fontes'],['faq','FAQ'],['socialProof','Prova social'],['shippingStory','Bloco logístico'],['related','Produtos relacionados']
];

const media = (src='') => src ? [{id:crypto.randomUUID(),label:'Produto',alt:'Imagem do produto',src}] : [];

export const DEFAULT_PRODUCTS = [];

export const DEFAULT_PDP_CONTENT = {
  categoryFallback:'Produto',
  chipDocumentation:'Documentação disponível',
  chipConservation:'Conservação informada',
  basicDeliveryLabel:'Entrega Básica',
  expressDeliveryLabel:'Entrega Expressa',
  buyNowLabel:'COMPRAR AGORA',
  addToCartLabel:'Adicionar ao carrinho',
  trustOrigin:'Procedência',
  trustDocumentation:'Documentação',
  trustDelivery:'Entrega',
  trustConservation:'Conservação',
  aboutTitle:'Sobre o produto',
  specsTitle:'Ficha técnica',
  deliveryTitle:'Entrega e conservação',
  safetyTitle:'Segurança e conservação',
  regulatoryTitle:'Regulamentação',
  documentationTitle:'Documentação',
  sourcesTitle:'Fontes',
  faqTitle:'Perguntas frequentes',
  reviewsTitle:'Experiência de compra',
  relatedTitle:'Também disponíveis',
  fromPriceLabel:'A partir de',
  officialDocumentLabel:'DOCUMENTO OFICIAL',
  defaultDocumentLabel:'Documento',
  openDocumentLabel:'Abrir documento',
  defaultSourceLabel:'Fonte',
  defaultSourceButton:'Acessar fonte',
  brandBoxTitle:''
};


export function normalizeProduct(p){
  return {
    id:p.id||crypto.randomUUID(), slug:p.slug||'', name:p.name||'', displayName:p.displayName||p.name||'', brand:p.brand||'', brandDescription:p.brandDescription||'', category:p.category||'', dosageFromUser:p.dosageFromUser||'', presentationFromUser:p.presentationFromUser||'', variantFromUser:p.variantFromUser||'', activeIngredient:p.activeIngredient||'', concentration:p.concentration||'', administration:p.administration||'', origin:p.origin||'', format:p.format||'', shortDescription:p.shortDescription||'', fullDescription:p.fullDescription||'', storage:p.storage||'', freezeWarning:p.freezeWarning||'', lightWarning:p.lightWarning||'', mainContraindication:p.mainContraindication||'', childrenWarning:p.childrenWarning||'', prescriptionRequired:!!p.prescriptionRequired,
    pricing:{basic:Number(p.pricing?.basic||0),express:Number(p.pricing?.express||0)}, promoPriceCents:p.promoPriceCents??null, expressAvailable:p.expressAvailable!==false,basicEta:p.basicEta||'',expressEta:p.expressEta||'',shippingFeeCents:p.shippingFeeCents??null,requiresRefrigeration:!!p.requiresRefrigeration,temperatureRange:p.temperatureRange||'',deliveryStorageNote:p.deliveryStorageNote||'',
    media:Array.isArray(p.media)?p.media:[],documents:Array.isArray(p.documents)?p.documents:[],sourceLinks:Array.isArray(p.sourceLinks)?p.sourceLinks:[],sourcesIntro:p.sourcesIntro||'',sourcesNote:p.sourcesNote||'',reviews:Array.isArray(p.reviews)?p.reviews:[],faqs:Array.isArray(p.faqs)?p.faqs:[],importantWarnings:Array.isArray(p.importantWarnings)?p.importantWarnings:[], regulatory:p.regulatory||null, regulatoryNotes:p.regulatoryNotes||'', documentation:p.documentation||null,safety:p.safety||null, pdpContent:{...DEFAULT_PDP_CONTENT,...(p.pdpContent||{})}, officialBrandUrl:p.officialBrandUrl||'',officialDocumentUrl:p.officialDocumentUrl||'',seoTitle:p.seoTitle||'',seoDescription:p.seoDescription||'',sortOrder:Number(p.sortOrder??999),isActive:p.isActive!==false,sectionVisibility:p.sectionVisibility||{}
  }
}
