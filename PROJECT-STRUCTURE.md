# Global Pharma — Estrutura do projeto

## Objetivo
Base completa do site Global Pharma sem produtos cadastrados. A estrutura visual, rotas, carrinho, checkout demonstrativo e CMS local estão preservados.

## Arquivos principais
- `index.html` — shell da aplicação.
- `styles.css` — design system, responsividade e componentes visuais.
- `app.js` — SPA, rotas, header, home, catálogo, PDP, carrinho, checkout e admin.
- `data.js` — schema/normalização dos produtos. `DEFAULT_PRODUCTS = []`.
- `assets/` — identidade visual e imagens disponíveis.
- `AGENTS.md` — regras para Codex/agentes de código.
- `.github/workflows/pages.yml` — publicação por GitHub Pages.
- `404.html` — fallback para rotas SPA no GitHub Pages.
- `.nojekyll` — publicação estática sem Jekyll.
- `package.json` — scripts de validação/servidor.

## Rotas públicas
- `/`
- `/produtos`
- `/produto/:slug`
- `/checkout`
- `/entrega`
- `/transparencia`
- `/rastreamento`
- `/contato`
- `/ajuda`
- `/termos`
- `/privacidade`
- `/trocas-e-devolucoes`

## Rotas administrativas
- `/admin`
- `/admin/produtos`

## Home
1. Barra institucional.
2. Header sticky, busca e carrinho.
3. Hero/carrossel.
4. Faixa de marcas.
5. Grade de produtos — vazia inicialmente.
6. Prova social.
7. Benefícios rápidos.
8. Entrega expressa.
9. Transparência.
10. Cuidado em cada etapa.
11. FAQ.
12. Footer.

## Produto / PDP
A página de produto é dinâmica e só existe depois de cadastrar um produto. Campos vazios não aparecem. Os blocos opcionais incluem confiança, descrição, ficha técnica, avaliações, entrega, segurança, documentação, regulatório, fontes, FAQ, prova social, logística e relacionados.

## Admin de produtos
O painel permite criar, editar, arquivar e restaurar produtos. Mantém campos de identidade, preço, entrega, mídia, segurança, regulatório, documentação, fontes, FAQ, avaliações, SEO e visibilidade de blocos.

## Persistência atual
Protótipo local via `localStorage`. Para produção, substituir por banco/auth/server seguro. Pagamento real e tracking de produção ainda não estão conectados.
