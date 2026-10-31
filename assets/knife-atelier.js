/**
 * White Hills Knives — Obsidian Atelier Client Engine
 * Handles Multi-Theme Switching, Ajax Cart Drawer, Blade Inspector Modal,
 * Real-Time Search Dialog, Metallurgy Visualizer, and Scroll Reveals.
 */

(function () {
  'use strict';

  // ----------------------------------------------------
  // 1. THEME MANAGER
  // ----------------------------------------------------
  const THEME_STORAGE_KEY = 'white-hills-atelier-theme';
  const THEMES = [
    { id: 'obsidian', name: 'Obsidian Forge', isDark: true, accent: '#e67e22', badge: 'Dark Atelier' },
    { id: 'light', name: 'Daylight Atelier', isDark: false, accent: '#93532b', badge: 'Light Theme' },
    { id: 'silver', name: 'Silver Damascus', isDark: true, accent: '#cbd5e1', badge: 'Steel Dark' },
    { id: 'imperial', name: 'Imperial Damascus', isDark: true, accent: '#d4af37', badge: 'Royal Dark' }
  ];

  function getStoredTheme() {
    try {
      let t = localStorage.getItem(THEME_STORAGE_KEY) || 'obsidian';
      if (t === 'nordic') t = 'light';
      return t;
    } catch (e) {
      return 'obsidian';
    }
  }

  function applyTheme(themeId) {
    const meta = THEMES.find((t) => t.id === themeId) || THEMES[0];
    const root = document.documentElement;

    root.classList.add('theme-transitioning');
    root.setAttribute('data-theme', meta.id);

    if (meta.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, meta.id);
    } catch (e) {}

    // Update Theme Switcher Pill UI
    document.querySelectorAll('[data-knife-current-theme-name]').forEach((el) => {
      el.textContent = meta.id === 'light' ? 'Light' : meta.name.split(' ')[0];
    });

    document.querySelectorAll('[data-knife-current-theme-dot]').forEach((el) => {
      el.style.backgroundColor = meta.accent;
    });

    // Update active state in theme dropdown menu
    document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
      if (btn.getAttribute('data-theme-choice') === meta.id) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);
  }

  function toggleLightDark() {
    const current = getStoredTheme();
    if (current === 'light') {
      applyTheme('obsidian');
    } else {
      applyTheme('light');
    }
  }

  // ----------------------------------------------------
  // 2. AJAX CART ENGINE
  // ----------------------------------------------------
  const FREE_SHIPPING_THRESHOLD = 15000; // in cents ($150.00)

  function formatMoney(cents) {
    if (window.Shopify && Shopify.formatMoney) {
      return Shopify.formatMoney(cents);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  async function fetchCart() {
    try {
      const res = await fetch('/cart.js');
      return await res.json();
    } catch (e) {
      console.error('Error fetching cart:', e);
      return null;
    }
  }

  async function addToCart(variantId, quantity = 1, properties = {}) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: quantity,
          properties: properties
        })
      });

      if (!res.ok) {
        throw new Error('Failed to add to cart');
      }

      const cart = await fetchCart();
      renderCartDrawer(cart);
      openCartDrawer();
      return true;
    } catch (e) {
      console.error('Error adding to cart:', e);
      alert('Could not add item to cart. Please try again.');
      return false;
    }
  }

  async function updateCartItem(lineKey, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          id: lineKey,
          quantity: quantity
        })
      });

      if (!res.ok) throw new Error('Update failed');
      const cart = await res.json();
      renderCartDrawer(cart);
    } catch (e) {
      console.error('Error updating cart line:', e);
    }
  }

  function renderCartDrawer(cart) {
    if (!cart) return;

    // Update badges
    document.querySelectorAll('[data-knife-cart-count]').forEach((badge) => {
      badge.textContent = cart.item_count;
      badge.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });

    const itemsContainer = document.getElementById('knife-cart-items-container');
    const footerContainer = document.getElementById('knife-cart-footer-container');
    const emptyContainer = document.getElementById('knife-cart-empty-state');
    const subtotalEl = document.getElementById('knife-cart-subtotal');
    const totalEl = document.getElementById('knife-cart-total');
    const countTitleEl = document.getElementById('knife-cart-piece-count');
    const progressFill = document.getElementById('knife-cart-progress-fill');
    const progressText = document.getElementById('knife-cart-progress-text');
    const progressPercent = document.getElementById('knife-cart-progress-percent');

    if (countTitleEl) {
      countTitleEl.textContent = `${cart.item_count} ${cart.item_count === 1 ? 'Piece Selected' : 'Pieces Selected'}`;
    }

    // Free shipping calculation
    const progress = Math.min(100, (cart.total_price / FREE_SHIPPING_THRESHOLD) * 100);
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.total_price);

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;

    if (progressText) {
      if (progress >= 100) {
        progressText.innerHTML = '<span style="color:var(--primary); font-weight:600;">Complimentary California Shipping Unlocked</span>';
      } else {
        progressText.innerHTML = `Add <strong style="color:var(--primary);">${formatMoney(remaining)}</strong> for free shipping`;
      }
    }

    if (cart.item_count === 0) {
      if (itemsContainer) itemsContainer.innerHTML = '';
      if (emptyContainer) emptyContainer.style.display = 'flex';
      if (footerContainer) footerContainer.style.display = 'none';
      return;
    }

    if (emptyContainer) emptyContainer.style.display = 'none';
    if (footerContainer) footerContainer.style.display = 'block';

    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);

    if (itemsContainer) {
      itemsContainer.innerHTML = cart.items
        .map((item) => {
          const shortTitle = item.product_title.split(' - ')[0].split(' – ')[0];
          const monogramProp = item.properties && item.properties['_Monogram'] ? item.properties['_Monogram'] : '';
          return `
            <div class="knife-cart-item" data-line-key="${item.key}">
              <img src="${item.image ? item.image : ''}" alt="${item.title}" />
              <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <h4 style="font-size:0.875rem; font-weight:500; margin:0 0 0.25rem 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--foreground);">
                    ${shortTitle}
                  </h4>
                  ${monogramProp ? `<p style="font-size:0.6875rem; color:var(--primary); font-style:italic; margin:0 0 0.25rem 0;">Custom Stamp: &ldquo;${monogramProp}&rdquo;</p>` : ''}
                  <p style="font-family:var(--font-display); font-size:0.875rem; color:var(--primary); margin:0;">
                    ${formatMoney(item.final_line_price)}
                  </p>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.5rem;">
                  <div style="display:flex; align-items:center; border:1px solid var(--border); border-radius:0.25rem; background:var(--background);">
                    <button type="button" class="knife-qty-btn" data-action="decrease" data-key="${item.key}" data-qty="${item.quantity - 1}" style="padding:0.25rem 0.5rem; background:none; border:none; color:var(--muted-foreground); cursor:pointer; font-weight:bold;">-</button>
                    <span style="padding:0 0.5rem; font-size:0.75rem; font-weight:600; color:var(--foreground);">${item.quantity}</span>
                    <button type="button" class="knife-qty-btn" data-action="increase" data-key="${item.key}" data-qty="${item.quantity + 1}" style="padding:0.25rem 0.5rem; background:none; border:none; color:var(--muted-foreground); cursor:pointer; font-weight:bold;">+</button>
                  </div>
                  <button type="button" class="knife-remove-btn" data-key="${item.key}" style="background:none; border:none; color:var(--muted-foreground); cursor:pointer; padding:0.25rem;" aria-label="Remove item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      // Attach quantity / remove events
      itemsContainer.querySelectorAll('.knife-qty-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          const qty = parseInt(btn.getAttribute('data-qty'), 10);
          updateCartItem(key, qty);
        });
      });

      itemsContainer.querySelectorAll('.knife-remove-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          updateCartItem(key, 0);
        });
      });
    }
  }

  function openCartDrawer() {
    const overlay = document.getElementById('knife-cart-drawer-overlay');
    if (overlay) {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    const overlay = document.getElementById('knife-cart-drawer-overlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  // ----------------------------------------------------
  // 3. BLADE INSPECTOR MODAL
  // ----------------------------------------------------
  let currentInspectedProduct = null;
  let modalQuantity = 1;

  function openBladeModal(data) {
    currentInspectedProduct = data;
    modalQuantity = 1;

    const modal = document.getElementById('knife-blade-modal-overlay');
    if (!modal) return;

    const imgEl = document.getElementById('knife-modal-image');
    const titleEl = document.getElementById('knife-modal-title');
    const priceEl = document.getElementById('knife-modal-price');
    const monogramInput = document.getElementById('knife-modal-monogram-input');
    const monogramPreviewBox = document.getElementById('knife-modal-monogram-preview');
    const monogramStampText = document.getElementById('knife-modal-monogram-stamp');
    const qtySpan = document.getElementById('knife-modal-qty-val');
    const addBtnText = document.getElementById('knife-modal-btn-text');

    if (imgEl) imgEl.src = data.image || '';
    if (titleEl) titleEl.textContent = data.title.split(' - ')[0].split(' – ')[0];
    if (priceEl) priceEl.textContent = data.priceFormatted || `$${data.price}`;
    if (monogramInput) monogramInput.value = '';
    if (monogramPreviewBox) monogramPreviewBox.style.display = 'none';
    if (qtySpan) qtySpan.textContent = '1';
    if (addBtnText) addBtnText.textContent = `Add to Order · ${data.priceFormatted || '$' + data.price}`;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeBladeModal() {
    const modal = document.getElementById('knife-blade-modal-overlay');
    if (modal) {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  // ----------------------------------------------------
  // 4. PREDICTIVE SEARCH DIALOG
  // ----------------------------------------------------
  let searchTimeout = null;

  function openSearchDialog() {
    const dialog = document.getElementById('knife-search-dialog-overlay');
    const input = document.getElementById('knife-search-input');
    if (dialog) {
      dialog.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  function closeSearchDialog() {
    const dialog = document.getElementById('knife-search-dialog-overlay');
    if (dialog) {
      dialog.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  async function performSearch(query) {
    const resultsContainer = document.getElementById('knife-search-results-list');
    if (!resultsContainer) return;

    if (!query.trim()) {
      resultsContainer.innerHTML = '<p class="eyebrow" style="color:var(--muted-foreground); padding:0.5rem 0;">Type to search forged Damascus blades...</p>';
      return;
    }

    try {
      const res = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[options][unavailable_products]=hide`);
      const data = await res.json();
      const products = data.resources.results.products || [];

      if (products.length === 0) {
        resultsContainer.innerHTML = `<div style="padding:2rem 0; text-align:center; color:var(--muted-foreground); font-size:0.875rem;">No Damascus blades match &ldquo;${query}&rdquo;.</div>`;
        return;
      }

      resultsContainer.innerHTML = `
        <p class="eyebrow" style="color:var(--muted-foreground); padding-bottom:0.5rem;">Found ${products.length} Blades</p>
        ${products.map((p) => `
          <div class="knife-search-result-row" data-handle="${p.handle}" data-title="${p.title}" data-price="${p.price}" data-image="${p.image}" style="display:flex; align-items:center; gap:1rem; padding:0.75rem; border-radius:0.5rem; cursor:pointer; transition:background 0.15s ease;">
            <img src="${p.image}" alt="${p.title}" style="width:3.5rem; height:3.5rem; object-fit:cover; border-radius:0.375rem; border:1px solid var(--border);" />
            <div style="flex:1; min-width:0;">
              <h4 style="font-size:0.875rem; font-weight:500; margin:0; color:var(--foreground); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${p.title.split(' - ')[0].split(' – ')[0]}
              </h4>
              <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
                <span style="font-family:var(--font-display); font-size:0.75rem; color:var(--primary); font-weight:600;">$${p.price}</span>
                <span style="font-size:0.65rem; color:var(--muted-foreground);">· 100% Hand-Forged</span>
              </div>
            </div>
            <span style="color:var(--muted-foreground); font-size:1.125rem;">&rarr;</span>
          </div>
        `).join('')}
      `;

      resultsContainer.querySelectorAll('.knife-search-result-row').forEach((row) => {
        row.addEventListener('click', () => {
          const handle = row.getAttribute('data-handle');
          const title = row.getAttribute('data-title');
          const price = row.getAttribute('data-price');
          const image = row.getAttribute('data-image');
          closeSearchDialog();
          openBladeModal({
            handle: handle,
            title: title,
            price: price,
            priceFormatted: '$' + price,
            image: image,
            variantId: null
          });
        });
      });
    } catch (e) {
      console.error('Search error:', e);
    }
  }

  // ----------------------------------------------------
  // 5. METALLURGY PATTERN VISUALIZER
  // ----------------------------------------------------
  const METALLURGY_PATTERNS = {
    raindrop: {
      name: 'Raindrop Pattern',
      layers: '320+ Folded Layers',
      steel: '1095 High-Carbon & 15N20 Nickel Alloy',
      etching: 'Deep Ferric Chloride Acid Bath',
      hrc: '58–60 HRC Vacuum Heat-Treated',
      desc: 'Created by pressing spherical dimples into the glowing billet before the final surface grind. As the peaks are flattened, concentric water-ripple circles are revealed across the blade.',
      specs: [
        'Concentric circular droplet eddies',
        'Superior edge retention from 15N20 contrast',
        'Ideal for folding pocket and EDC blades'
      ]
    },
    twist: {
      name: 'Twist (Torsion) Billet',
      layers: '288 Folded Layers',
      steel: 'Forge-Welded Carbon & Spring Steel',
      etching: 'Controlled Etch & Neutralizing Oil',
      hrc: '59–60 HRC Annealed & Quenched',
      desc: 'The hot billet is twisted under high torque along its longitudinal axis, spinning the layers into a swirling storm of metallic ribbons before being forged flat.',
      specs: [
        'Dynamic flowing ribbon bands',
        'Even structural density along spine and belly',
        'Heirloom appearance on hunting blades'
      ]
    },
    ladder: {
      name: 'Ladder Damascus',
      layers: '384 Folded Layers',
      steel: 'High-Density Alternating Alloy Strata',
      etching: 'Nitric & Citric Dual Etch',
      hrc: '60 HRC Cryogenic Temper',
      desc: 'Precision perpendicular grooves are forged or ground across the billet, disrupting the parallel layers into rhythmic wave rungs that mimic natural geological strata.',
      specs: [
        'Uniform rhythmic wave bands',
        'Stunning light reflection when blade tilts',
        'Signature choice for presentation pieces'
      ]
    },
    vg10: {
      name: '73-Layer Japanese VG-10',
      layers: '73 Clad Layers over VG-10 Core',
      steel: 'Cobalt-Enriched VG-10 Core + Stainless Damascus',
      etching: 'Suminagashi Floating Cloud Polish',
      hrc: '60–62 HRC Ultra-Precision Cryo',
      desc: 'A high-hardness Japanese VG-10 stainless core hardened to 60-62 HRC, encased in 36 alternating layers on each flank for unmatched culinary sharpness and stain resistance.',
      specs: [
        'Ultra-fine surgical cutting geometry',
        'High corrosion & acid resistance in kitchen use',
        'Ergonomic balance for delicate push-cutting'
      ]
    }
  };

  function initMetallurgyTabs() {
    const tabs = document.querySelectorAll('[data-knife-metallurgy-tab]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const patternKey = tab.getAttribute('data-knife-metallurgy-tab');
        const data = METALLURGY_PATTERNS[patternKey];
        if (!data) return;

        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        const titleEl = document.getElementById('knife-metal-title');
        const layersEl = document.getElementById('knife-metal-layers');
        const descEl = document.getElementById('knife-metal-desc');
        const steelEl = document.getElementById('knife-metal-steel');
        const etchingEl = document.getElementById('knife-metal-etching');
        const hrcEl = document.getElementById('knife-metal-hrc');
        const specsList = document.getElementById('knife-metal-specs-list');

        if (titleEl) titleEl.textContent = data.name;
        if (layersEl) layersEl.textContent = data.layers;
        if (descEl) descEl.textContent = data.desc;
        if (steelEl) steelEl.textContent = data.steel;
        if (etchingEl) etchingEl.textContent = data.etching;
        if (hrcEl) hrcEl.textContent = data.hrc;

        if (specsList) {
          specsList.innerHTML = data.specs
            .map((s) => `
              <li style="display:flex; align-items:flex-start; gap:0.625rem; font-size:0.75rem; color:var(--muted-foreground); margin-bottom:0.5rem;">
                <span style="color:var(--primary);">&#10022;</span>
                <span>${s}</span>
              </li>
            `)
            .join('');
        }
      });
    });
  }

  // ----------------------------------------------------
  // 6. CATALOG CATEGORY FILTER
  // ----------------------------------------------------
  function initCatalogFilter() {
    const filterTabs = document.querySelectorAll('[data-knife-catalog-filter]');
    const cards = document.querySelectorAll('.knife-product-card');

    filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const category = tab.getAttribute('data-knife-catalog-filter');
        filterTabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        cards.forEach((card) => {
          if (category === 'all') {
            card.style.display = 'flex';
          } else {
            const cardCat = card.getAttribute('data-category') || '';
            const cardTitle = (card.getAttribute('data-title') || '').toLowerCase();
            let match = cardCat === category;

            if (!match) {
              if (category === 'pocket' && (cardTitle.includes('pocket') || cardTitle.includes('folding'))) match = true;
              if (category === 'hunting' && (cardTitle.includes('hunting') || cardTitle.includes('skinner') || cardTitle.includes('kukri') || cardTitle.includes('dagger'))) match = true;
              if (category === 'chef' && (cardTitle.includes('chef') || cardTitle.includes('kiritsuke') || cardTitle.includes('vg10'))) match = true;
              if (category === 'axes' && (cardTitle.includes('axe') || cardTitle.includes('hatchet'))) match = true;
            }

            card.style.display = match ? 'flex' : 'none';
          }
        });
      });
    });
  }

  // ----------------------------------------------------
  // 7. SCROLL REVEAL OBSERVER
  // ----------------------------------------------------
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // ----------------------------------------------------
  // DOM READY INITIALIZATION
  // ----------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Theme setup
    const initialTheme = getStoredTheme();
    applyTheme(initialTheme);

    // Light/Dark toggle buttons
    document.querySelectorAll('[data-knife-toggle-light-dark]').forEach((btn) => {
      btn.addEventListener('click', toggleLightDark);
    });

    // Theme dropdown trigger
    const themeDropdownPill = document.querySelector('[data-knife-theme-dropdown-trigger]');
    const themeDropdownMenu = document.querySelector('[data-knife-theme-dropdown-menu]');
    if (themeDropdownPill && themeDropdownMenu) {
      themeDropdownPill.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdownMenu.classList.toggle('is-open');
      });

      document.addEventListener('click', (e) => {
        if (!themeDropdownMenu.contains(e.target) && !themeDropdownPill.contains(e.target)) {
          themeDropdownMenu.classList.remove('is-open');
        }
      });
    }

    // Granular theme option buttons
    document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tid = btn.getAttribute('data-theme-choice');
        applyTheme(tid);
        if (themeDropdownMenu) themeDropdownMenu.classList.remove('is-open');
      });
    });

    // 2. Cart drawer triggers
    document.querySelectorAll('[data-knife-open-cart]').forEach((btn) => {
      btn.addEventListener('click', () => {
        fetchCart().then(renderCartDrawer);
        openCartDrawer();
      });
    });

    document.querySelectorAll('[data-knife-close-cart]').forEach((btn) => {
      btn.addEventListener('click', closeCartDrawer);
    });

    const cartOverlay = document.getElementById('knife-cart-drawer-overlay');
    if (cartOverlay) {
      cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeCartDrawer();
      });
    }

    // Initialize cart state
    fetchCart().then(renderCartDrawer);

    // 3. Blade Inspector Modal triggers
    document.querySelectorAll('[data-knife-inspect]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.knife-product-card');
        if (!card) return;
        const data = {
          variantId: card.getAttribute('data-variant-id'),
          handle: card.getAttribute('data-handle'),
          title: card.getAttribute('data-title'),
          price: card.getAttribute('data-price'),
          priceFormatted: card.getAttribute('data-price-formatted'),
          image: card.getAttribute('data-image')
        };
        openBladeModal(data);
      });
    });

    // Card click opens modal unless clicked on quick add
    document.querySelectorAll('.knife-product-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-knife-quick-add]')) return;
        const data = {
          variantId: card.getAttribute('data-variant-id'),
          handle: card.getAttribute('data-handle'),
          title: card.getAttribute('data-title'),
          price: card.getAttribute('data-price'),
          priceFormatted: card.getAttribute('data-price-formatted'),
          image: card.getAttribute('data-image')
        };
        openBladeModal(data);
      });
    });

    // Quick Add buttons
    document.querySelectorAll('[data-knife-quick-add]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const card = btn.closest('.knife-product-card');
        if (!card) return;
        const variantId = card.getAttribute('data-variant-id');
        if (!variantId) {
          window.location.href = `/products/${card.getAttribute('data-handle')}`;
          return;
        }

        btn.disabled = true;
        const origText = btn.innerHTML;
        btn.innerHTML = '<span>Added &#10003;</span>';

        await addToCart(variantId, 1);

        setTimeout(() => {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 1500);
      });
    });

    // Blade modal close buttons
    document.querySelectorAll('[data-knife-close-modal]').forEach((btn) => {
      btn.addEventListener('click', closeBladeModal);
    });

    const modalOverlay = document.getElementById('knife-blade-modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeBladeModal();
      });
    }

    // Modal quantity controls
    const modalMinus = document.getElementById('knife-modal-qty-minus');
    const modalPlus = document.getElementById('knife-modal-qty-plus');
    const modalQtySpan = document.getElementById('knife-modal-qty-val');
    const modalBtnText = document.getElementById('knife-modal-btn-text');

    if (modalMinus && modalPlus && modalQtySpan) {
      modalMinus.addEventListener('click', () => {
        modalQuantity = Math.max(1, modalQuantity - 1);
        modalQtySpan.textContent = modalQuantity;
        if (currentInspectedProduct && modalBtnText) {
          const unitPrice = parseFloat(currentInspectedProduct.price) || 0;
          modalBtnText.textContent = `Add to Order · $${(unitPrice * modalQuantity).toFixed(2)}`;
        }
      });

      modalPlus.addEventListener('click', () => {
        modalQuantity += 1;
        modalQtySpan.textContent = modalQuantity;
        if (currentInspectedProduct && modalBtnText) {
          const unitPrice = parseFloat(currentInspectedProduct.price) || 0;
          modalBtnText.textContent = `Add to Order · $${(unitPrice * modalQuantity).toFixed(2)}`;
        }
      });
    }

    // Modal monogram customizer
    const monogramInput = document.getElementById('knife-modal-monogram-input');
    const monogramPreviewBox = document.getElementById('knife-modal-monogram-preview');
    const monogramStamp = document.getElementById('knife-modal-monogram-stamp');

    if (monogramInput && monogramPreviewBox && monogramStamp) {
      monogramInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
        e.target.value = val;
        if (val) {
          monogramPreviewBox.style.display = 'block';
          monogramStamp.textContent = val;
        } else {
          monogramPreviewBox.style.display = 'none';
        }
      });
    }

    // Modal Add to Order button
    const modalAddBtn = document.getElementById('knife-modal-add-btn');
    if (modalAddBtn) {
      modalAddBtn.addEventListener('click', async () => {
        if (!currentInspectedProduct) return;
        const variantId = currentInspectedProduct.variantId;
        if (!variantId) {
          window.location.href = `/products/${currentInspectedProduct.handle}`;
          return;
        }

        const monogram = monogramInput ? monogramInput.value.trim() : '';
        const props = monogram ? { '_Monogram': monogram } : {};

        modalAddBtn.disabled = true;
        const origContent = modalAddBtn.innerHTML;
        modalAddBtn.innerHTML = '<span>Added to Atelier Ledger &#10003;</span>';

        await addToCart(variantId, modalQuantity, props);

        setTimeout(() => {
          modalAddBtn.innerHTML = origContent;
          modalAddBtn.disabled = false;
          closeBladeModal();
        }, 1200);
      });
    }

    // 4. Search Dialog triggers
    document.querySelectorAll('[data-knife-open-search]').forEach((btn) => {
      btn.addEventListener('click', openSearchDialog);
    });

    document.querySelectorAll('[data-knife-close-search]').forEach((btn) => {
      btn.addEventListener('click', closeSearchDialog);
    });

    const searchOverlay = document.getElementById('knife-search-dialog-overlay');
    if (searchOverlay) {
      searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearchDialog();
      });
    }

    const searchInput = document.getElementById('knife-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          performSearch(e.target.value);
        }, 250);
      });
    }

    // Global ESC key listener to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCartDrawer();
        closeBladeModal();
        closeSearchDialog();
      }
    });

    // 5. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('knife-mobile-menu-btn');
    const mobileMenuDrawer = document.getElementById('knife-mobile-menu-drawer');
    if (mobileMenuBtn && mobileMenuDrawer) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenuDrawer.classList.toggle('is-open');
      });
    }

    // 6. Initialize Metallurgy Tabs, Catalog Filter & Scroll Reveal
    initMetallurgyTabs();
    initCatalogFilter();
    initScrollReveal();
  });

  // Expose global API
  window.KnifeAtelier = {
    applyTheme,
    toggleLightDark,
    openCartDrawer,
    closeCartDrawer,
    openBladeModal,
    closeBladeModal,
    openSearchDialog,
    closeSearchDialog,
    addToCart
  };
})();

