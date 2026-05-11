/* ═══════════════════════════════════════════════════════
   willgomes.art · global scripts
   ═══════════════════════════════════════════════════════ */

// Reveal-on-scroll
(function() {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }
})();

// Newsletter form fake-success (mailto until Buttondown wired up)
document.querySelectorAll('.news__form').forEach(form => {
  form.addEventListener('submit', (e) => {
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
// LIGHTBOX (portfolio page)
// ═══════════════════════════════════════════════════════

const PRICING = [
  { size: '21 × 30 cm',  edition: 'Edição de 30', price: 'R$ 600' },
  { size: '30 × 42 cm',  edition: 'Edição de 25', price: 'R$ 1.200' },
  { size: '42 × 60 cm',  edition: 'Edição de 15', price: 'R$ 2.400' },
  { size: '60 × 84 cm',  edition: 'Edição de 10', price: 'R$ 4.500' },
  { size: '84 × 118 cm', edition: 'Edição de 5',  price: 'R$ 9.000' }
];

function pricingList() {
  return PRICING.map(p =>
    `<li class="lb-pricing__item">
       <span class="lb-pricing__size">${p.size}</span>
       <span class="lb-pricing__price">${p.price}</span>
       <span class="lb-pricing__edition">${p.edition}</span>
     </li>`
  ).join('');
}

async function initPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  let prints = [];
  try {
    const res = await fetch('/assets/prints.json');
    prints = await res.json();
  } catch (e) {
    console.error('Failed to load prints', e);
    return;
  }

  // Render grid
  prints.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'portfolio-card reveal';
    card.innerHTML = `
      <div class="frame">
        <img src="${p.url}" alt="${p.title} · ${p.description ? p.description.split('·')[0].trim() : 'light painting'}" loading="lazy">
      </div>
      <div class="portfolio-card-meta">
        <span class="portfolio-card-title">${p.title}</span>
        <span class="portfolio-card-cat">${p.category}</span>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(prints, idx));
    grid.appendChild(card);
  });

  // Re-observe new reveals
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.portfolio-card.reveal').forEach(el => io.observe(el));

  // Lightbox state
  let currentPrints = prints;
  let currentIdx = 0;

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbTitle = document.getElementById('lb-title');
  const lbCat = document.getElementById('lb-cat');
  const lbDesc = document.getElementById('lb-desc');
  const lbTags = document.getElementById('lb-tags');
  const lbCta = document.getElementById('lb-cta');
  const lbPricingList = document.getElementById('lb-pricing-list');

  // Initialize pricing list once (organic, no table)
  if (lbPricingList) lbPricingList.innerHTML = pricingList();

  window.openLightbox = function(arr, idx) {
    currentPrints = arr;
    currentIdx = idx;
    const p = arr[idx];
    lbImg.src = p.url;
    lbImg.alt = p.title;
    lbTitle.textContent = p.title;
    lbCat.textContent = p.category;
    lbDesc.textContent = p.description || '';
    lbTags.innerHTML = (p.tags || []).map(t => `<span>${t}</span>`).join('');
    const subj = encodeURIComponent(`Interesse em print: ${p.title} (${p.filename})`);
    const body = encodeURIComponent(`Olá Willians,\n\nTenho interesse no print "${p.title}" (ref: ${p.filename}).\n\nGostaria de saber tamanhos disponíveis, prazo de entrega e forma de pagamento.\n\nObrigado.`);
    lbCta.href = `mailto:willians.design@gmail.com?subject=${subj}&body=${body}`;
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
}

initPortfolio();
