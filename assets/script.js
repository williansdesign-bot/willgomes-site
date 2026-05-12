/* ═══════════════════════════════════════════════════════
   willgomes.art · global scripts
   ═══════════════════════════════════════════════════════ */

// Reveal-on-scroll
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Newsletter form fake-success (mailto until Buttondown wired up)
document.querySelectorAll('.news__form').forEach(form => {
  form.addEventListener('submit', () => {
    const btn = form.querySelector('button');
    setTimeout(() => {
      btn.textContent = 'Enviado';
      setTimeout(() => {
        form.reset();
        btn.textContent = 'Receber aviso';
      }, 3500);
    }, 100);
  });
});

// ═══════════════════════════════════════════════════════
// LOJA + LIGHTBOX
// ═══════════════════════════════════════════════════════

const PRICING = [
  { size_key: 'a4', size: '21 × 30 cm',  edition: 'Edição de 30', price: 'R$ 600' },
  { size_key: 'a3', size: '30 × 42 cm',  edition: 'Edição de 25', price: 'R$ 1.200' },
  { size_key: 'a2', size: '42 × 60 cm',  edition: 'Edição de 15', price: 'R$ 2.400' },
  { size_key: 'a1', size: '60 × 84 cm',  edition: 'Edição de 10', price: 'R$ 4.500' },
  { size_key: 'a0', size: '84 × 118 cm', edition: 'Edição de 5',  price: 'R$ 9.000' }
];

// Stripe test mode toggle: localStorage.setItem('stripeMode', 'test') no console pra ativar
// Quando conta LIVE for ativada, troca pra 'live' (ou removo o gate)
const STRIPE_MODE = (typeof localStorage !== 'undefined' && localStorage.getItem('stripeMode')) || 'off';

function pricingList() {
  return PRICING.map((p, idx) =>
    `<li class="lb-pricing__item" data-size-idx="${idx}" role="button" tabindex="0" aria-label="Selecionar tamanho ${p.size} por ${p.price}">
       <span class="lb-pricing__size">${p.size}</span>
       <span class="lb-pricing__price">${p.price}</span>
       <span class="lb-pricing__edition">${p.edition}</span>
     </li>`
  ).join('');
}

async function initGallery() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  let prints = [];
  try {
    const res = await fetch('/assets/prints.json?t=' + Date.now());
    prints = await res.json();
  } catch (e) {
    console.error('Failed to load prints', e);
    return;
  }

  // Render grid
  prints.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'portfolio-card reveal';
    card.id = p.id;
    card.innerHTML = `
      <div class="frame">
        <img src="${p.url}" alt="${p.title}" loading="lazy">
      </div>
      <div class="portfolio-card-meta">
        <span class="portfolio-card-title">${p.title}</span>
        <span class="portfolio-card-cat">${p.category}</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(prints, idx));
    grid.appendChild(card);
  });

  // Observe new reveal cards
  document.querySelectorAll('.portfolio-card.reveal').forEach(el => revealObserver.observe(el));

  // Lightbox state
  let currentPrints = prints;
  let currentIdx = 0;
  let selectedSizeIdx = null;

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbTitle = document.getElementById('lb-title');
  const lbCat = document.getElementById('lb-cat');
  const lbDesc = document.getElementById('lb-desc');
  const lbTags = document.getElementById('lb-tags');
  const lbCta = document.getElementById('lb-cta');
  const lbPricingList = document.getElementById('lb-pricing-list');

  // Initialize pricing list (clickable size selector)
  if (lbPricingList) {
    lbPricingList.innerHTML = pricingList();
    lbPricingList.querySelectorAll('.lb-pricing__item').forEach(item => {
      const select = () => {
        selectedSizeIdx = parseInt(item.dataset.sizeIdx);
        lbPricingList.querySelectorAll('.lb-pricing__item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        updateCta();
      };
      item.addEventListener('click', select);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });
  }

  function updateCta() {
    const p = currentPrints[currentIdx];
    if (!p) return;
    if (selectedSizeIdx !== null) {
      const sz = PRICING[selectedSizeIdx];
      lbCta.textContent = `Comprar ${sz.size} · ${sz.price}`;
      lbCta.classList.add('lb-cta--ready');

      // Se temos Payment Link Stripe pra essa obra+tamanho e o modo tá ativo, usa ele
      const stripeLink = p.payment_links && p.payment_links[sz.size_key];
      if (stripeLink && (STRIPE_MODE === 'test' || STRIPE_MODE === 'live')) {
        lbCta.href = stripeLink.url;
        lbCta.target = '_blank';
        lbCta.rel = 'noopener';
        lbCta.textContent = `Comprar ${sz.size} · ${sz.price}`;
      } else {
        // Fallback: email pré-formatado
        lbCta.removeAttribute('target');
        lbCta.removeAttribute('rel');
        const subj = encodeURIComponent(`Print: ${p.title} · ${sz.size} · ${sz.price}`);
        const body = encodeURIComponent(`Olá Willians,

Tenho interesse no print:

  Obra: ${p.title} (ref ${p.filename})
  Tamanho: ${sz.size}
  ${sz.edition}
  Valor inicial: ${sz.price}

Confirma disponibilidade, prazo de entrega e forma de pagamento (Pix, transferência ou cartão)?

Obrigado.`);
        lbCta.href = `mailto:willians.design@gmail.com?subject=${subj}&body=${body}`;
        lbCta.textContent = `Solicitar ${sz.size} · ${sz.price}`;
      }
    } else {
      lbCta.textContent = 'Toque um tamanho acima';
      lbCta.classList.remove('lb-cta--ready');
      lbCta.href = '#';
      lbCta.removeAttribute('target');
    }
  }

  window.openLightbox = function(arr, idx) {
    currentPrints = arr;
    currentIdx = idx;
    selectedSizeIdx = null;
    const p = arr[idx];
    lbImg.src = p.url;
    lbImg.alt = p.title;
    lbTitle.textContent = p.title;
    lbCat.textContent = p.category;
    lbDesc.textContent = p.description || '';
    lbTags.innerHTML = (p.tags || []).map(t => `<span>${t}</span>`).join('');
    lbPricingList?.querySelectorAll('.lb-pricing__item').forEach(i => i.classList.remove('selected'));
    updateCta();
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function() {
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  function nextPrint() { openLightbox(currentPrints, (currentIdx + 1) % currentPrints.length); }
  function prevPrint() { openLightbox(currentPrints, (currentIdx - 1 + currentPrints.length) % currentPrints.length); }

  document.querySelector('.lb-close')?.addEventListener('click', closeLightbox);
  document.querySelector('.lb-next')?.addEventListener('click', nextPrint);
  document.querySelector('.lb-prev')?.addEventListener('click', prevPrint);
  lb?.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (lb.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') nextPrint();
    else if (e.key === 'ArrowLeft') prevPrint();
  });

  // Hash deep-link: /#p01 opens that print
  if (location.hash && /^#p\d+$/.test(location.hash)) {
    const id = location.hash.slice(1);
    const idx = prints.findIndex(p => p.id === id);
    if (idx >= 0) {
      setTimeout(() => openLightbox(prints, idx), 200);
    }
  }
}

initGallery();
