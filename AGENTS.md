# Global Pharma — Codex project instructions

## Objective
Maintain the independent Global Pharma storefront rebuild. Work section by section, preserving visual parity with the approved/current reference site while keeping the codebase simple and dependency-free unless a change clearly requires otherwise.

## Current stack
- Static HTML/CSS/JavaScript.
- `index.html` is the shell.
- `app.js` contains the SPA renderer, routes, cart, product admin and local state.
- `data.js` contains catalog seed data and shared product structures.
- `styles.css` contains the full design system and responsive styles.
- `assets/` contains local brand assets.

## Non-negotiable product behavior
- Empty product information must be omitted elegantly. Never render “pendente”, “em cadastro”, “a cadastrar”, fake placeholders, invented technical data, invented regulatory data, invented reviews or invented claims.
- Hidden optional sections must not render, while their saved data must remain preserved.
- Keep hero/name/price/purchase CTA available when a product is active.
- Preserve cart behavior and route compatibility.
- Do not introduce real payment processing, external tracking, medical claims or production credentials unless explicitly requested and configured.

## Visual direction
- Brand: Global Pharma.
- Palette: navy `#061D4D`, royal blue `#145AC6`, CTA `#0756C7 → #053587`, white/ice backgrounds, border `#DCE5F0`.
- Fonts: Inter + Bebas Neue.
- Mobile-first. Header and product grid should stay compact and high-trust.
- Match the current approved implementation before redesigning anything.

## Working method
1. Change only the requested section unless a shared primitive must be adjusted.
2. Preserve unrelated sections and behavior.
3. Check desktop and mobile CSS after every visual change.
4. Run `node --check app.js` and `node --check data.js` before finishing.
5. For route changes, confirm `/`, `/produtos`, `/produto/<slug>`, `/checkout`, `/admin` and `/admin/produtos` continue rendering.
6. Keep commits small and named after the section changed.

## Deployment
GitHub Pages is the intended static host. The workflow in `.github/workflows/pages.yml` deploys the repository root. `404.html` mirrors the SPA shell so direct navigation to client-side routes still boots the app.
