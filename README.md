# Global Pharma — Estrutura completa sem produtos

Esta versão contém a estrutura visual e funcional da Global Pharma, sem nenhum produto pré-cadastrado. O catálogo inicia vazio e os produtos podem ser criados pelo painel administrativo.

## O que foi alinhado com o site atual

- barra institucional no topo
- header branco sticky com navegação, busca, conta, favoritos e carrinho
- identidade navy / royal / ice
- tipografia Inter + Bebas Neue
- hero em carrossel com proporção desktop e mobile
- faixa de marcas
- grade compacta de produtos (2 colunas mobile, até 5 desktop)
- prova social
- benefícios rápidos
- entrega expressa compacta
- transparência
- seção “Cuidado em cada etapa”
- FAQ
- footer institucional em navy
- catálogo `/produtos`
- PDP `/produto/:slug` seguindo a mesma linguagem visual
- sticky buy no mobile
- checkout visual
- admin de produtos completo

## Regra de conteúdo da PDP

Campo vazio não aparece. Não é mostrado como “pendente”.

O admin preserva campos avançados de:
- regulatório
- documentação
- segurança
- fontes
- documentos
- FAQ
- avaliações
- visibilidade dos blocos

## Rodar localmente

```bash
python3 -m http.server 4173
```

Abra:

```text
http://127.0.0.1:4173
```

## Rotas principais

- `/`
- `/produtos`
- `/produto/:slug` — disponível depois que um produto for cadastrado
- `/checkout`
- `/entrega`
- `/transparencia`
- `/rastreamento`
- `/admin`
- `/admin/produtos`

## Estado das integrações

Esta cópia é independente, inicia com o catálogo vazio e usa `localStorage` para catálogo/carrinho. Supabase, autenticação real, PYX Gate e tracking de produção ainda devem ser conectados na etapa de backend. Nenhum segredo real foi incluído no frontend.

## Observação sobre mídia

A estrutura e proporções seguem o site atual. Alguns banners/imagens do CMS original não estavam disponíveis como arquivos exportáveis; por isso a réplica inclui os assets que estavam disponíveis e placeholders neutros nos slots restantes. Esses slots podem ser substituídos diretamente sem alterar a estrutura.

## Progresso do acabamento 1:1

- **Seção 1 — Barra superior + Header: concluída**
  - barra institucional navy
  - identidade Global Pharma com ícone oficial
  - navegação desktop e estado ativo
  - busca desktop/mobile com sugestões
  - conta, favoritos e carrinho com contador
  - header sticky com sombra ao rolar
  - menu mobile abrir/fechar
  - navegação para âncoras preservada


## Progresso de reconstrução 1:1

- [x] Seção 1 — barra superior + header: logo, navegação, busca com autocomplete, conta/favoritos, carrinho lateral, sticky, sombra no scroll, menu e busca mobile.
- [ ] Seção 2 — hero / banners principais.
- [ ] Demais seções da Home.

## Codex + GitHub workflow

Este projeto está preparado para trabalhar com Codex Cloud usando um repositório GitHub.

1. Crie um repositório novo no GitHub, preferencialmente `global-pharma-site` (ou `<seu-usuario>.github.io` se quiser a URL raiz do GitHub Pages).
2. Envie todos os arquivos deste diretório para a branch `main`.
3. No Codex Cloud, conecte o GitHub, autorize esse repositório e crie um ambiente para ele.
4. O arquivo `AGENTS.md` contém as regras do projeto para o Codex.
5. Para publicar via GitHub Pages, em **Settings → Pages**, escolha **GitHub Actions** como source. O workflow `.github/workflows/pages.yml` fará o deploy a cada push na `main`.

### Observação sobre URL do GitHub Pages
Os arquivos usam caminhos absolutos (`/styles.css`, `/app.js`) e rotas SPA. Para evitar ajustes de base path, o formato mais simples é publicar como site de usuário em um repositório chamado `<seu-usuario>.github.io`. Se preferir um repositório de projeto como `global-pharma-site`, adapte os caminhos para o subdiretório do Pages ou use um domínio customizado.


## Estado inicial desta cópia

- `DEFAULT_PRODUCTS` está vazio.
- O catálogo público começa com 0 produtos.
- O carrinho começa vazio.
- Cadastre produtos em `/admin/produtos`.
- Todos os campos avançados e a regra de omissão elegante da PDP foram preservados.
