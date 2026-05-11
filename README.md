# willgomes.art

Site oficial de Willians Gomes. Light painting e fotografia fine art. Galeria com 26 obras em edição limitada e loja com seletor de tamanho.

**Produção:** [willgomes.art](https://willgomes.art)
**Preview Pages:** [willgomes-site.pages.dev](https://willgomes-site.pages.dev)

## Stack

- HTML, CSS, JS vanilla (sem frameworks)
- Tipografia: Cormorant Garamond, Inter, JetBrains Mono
- Hosting: Cloudflare Pages
- DNS: Cloudflare (zona willgomes.art)
- Deploy automático no push pra `main` + `wrangler pages deploy`
- CDN global edge

## Estrutura

```
willgomes-site/
├── index.html          single-page (Hero, Sobre, Galeria, Contato)
├── portfolio.html      redirect 301 pra /#galeria (legado)
├── edit.html           editor admin (senha tempo-unico)
├── _redirects          Cloudflare Pages routing
├── assets/
│   ├── style.css       design tokens + layout completo
│   ├── script.js       galeria, lightbox, seletor de tamanho
│   └── prints.json     26 obras com metadata
└── README.md
```

## Loja

Cada obra abre lightbox com:

- Imagem em moldura preta
- Título, categoria, descrição, tags
- Lista clicável de 5 tamanhos (A4 a A0)
- CTA habilita ao selecionar tamanho
- Email pré-formatado com obra + tamanho + valor

| Tamanho | Edição | Valor inicial |
|---|---|---|
| 21 × 30 cm | 30 cópias | R$ 600 |
| 30 × 42 cm | 25 cópias | R$ 1.200 |
| 42 × 60 cm | 15 cópias | R$ 2.400 |
| 60 × 84 cm | 10 cópias | R$ 4.500 |
| 84 × 118 cm | 5 cópias | R$ 9.000 |

Escalada: +25% a cada 20% da edição vendida.

## Editar conteúdo

Workflow preferencial: Willians grava áudio sobre cada obra, Claude refina e atualiza `assets/prints.json` via deploy.

Alternativa manual: página `/edit` (senha `tempo-unico`) com 28 cards editáveis, auto-save no localStorage, export JSON.

## Deploy manual

```bash
git clone git@github.com:williansdesign-bot/willgomes-site.git
cd willgomes-site
# editar arquivos
git add . && git commit -m "..." && git push
wrangler pages deploy . --project-name willgomes-site --branch main
```

## Roadmap

- [x] Repo + Cloudflare Pages + DNS + SSL
- [x] willgomes.art configurado
- [x] Single-page com 26 obras + lightbox + loja
- [x] Seletor de tamanho funcional (email pré-formatado)
- [x] Edit page (admin)
- [ ] Stripe Brasil: gerar 130 Payment Links (26 × 5)
- [ ] lightpainting.art.br: redirect 301 pra willgomes.art
- [ ] Newsletter Buttondown integrado
- [ ] Design refinado via claude.ai/design
- [ ] Versão EN
- [ ] Galeria NFT (Fase 1 objkt.com Tezos)
- [ ] Blog com 5 posts seminais (PT existe, EN pendente)

## Referência local

Conteúdo expandido (séries, páginas extras, blog em PT, setups, testimonials, catálogo PDF) em:

```
~/Claude-projects/4_pessoal/willgomes-lightpainting/site-cargo/
```

## Versionamento

| Versão | Data | Mudança principal |
|---|---|---|
| V1 | 10/05 | Placeholder elegante |
| V2 | 10/05 | Hero refinado + 3 thumbs |
| V3 | 10/05 | Portfolio dedicado + molduras pretas |
| V4 | 11/05 | Single-page snap + zero travessões |
| V5 | 11/05 | 26 obras refinadas via áudio |
| V6 | 11/05 | Galeria + loja consolidada + seletor de tamanho |

## Memórias relacionadas (Claude)

- `workflow_audio_descricoes_fotos.md` — como editar via áudio
- `feedback_evitar_travessao.md` — nunca usar `—`
- `numerologia_evitar_4.md` — evitar o número 4 em contagens
- `porkbun_keys_pending_rotation.md` — rotacionar chaves após estabilizar
- `cloudflare_dns_token_pending_rotation.md` — idem Cloudflare
