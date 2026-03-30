// 1. CONFIGURATION AIRTABLE (Vérifie tes infos)
const AIRTABLE_TOKEN = "patzsYJPVFm5xiZJ5"; 
const BASE_ID = "app4MOSphwazGogTf"; 
const TABLE_NAME = "Table 1"; 

// 2. RÉCUPÉRATION ET TRI DES DONNÉES
async function initDynamicContent() {
    const url = `https://api.airtable.com/v1/${BASE_ID}/${TABLE_NAME}`;
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        const records = data.records.map(r => ({ id: r.id, ...r.fields }));

        // On sépare les Menus du reste
        const menus = records.filter(item => item.Type === 'Menu');
        const toutLeReste = records.filter(item => item.Type !== 'Menu');

        console.log("Données chargées :", { menus, toutLeReste });

        // Mise à jour visuelle
        updateMenusOnPage(menus, toutLeReste);
        
        // Optionnel : Si tu as des sections Cocktails/Boissons
        updateExtraSections(toutLeReste);

    } catch (error) {
        console.error("Erreur Airtable:", error);
    }
}

// 3. INJECTION DANS LES CARTES DE MENU
function updateMenusOnPage(menus, toutLeReste) {
    menus.forEach(menu => {
        // On cible la carte par l'attribut data-menu (ex: veggie, ocean...)
        const menuSlug = menu.Nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const card = document.querySelector(`.menu-card[data-menu="${menuSlug}"]`);
        
        if (card) {
            // Mise à jour du prix
            const priceTag = card.querySelector('.prix-fixe');
            if (priceTag) priceTag.textContent = `${menu.Prix} €`;

            // Mise à jour de la liste des plats
            const list = card.querySelector('.menu-items-list');
            if (list) {
                list.innerHTML = ''; // On nettoie l'ancien texte

                // On récupère les éléments liés à ce menu
                const elementsDuMenu = toutLeReste.filter(p => 
                    p["Menu Parent"] && p["Menu Parent"].includes(menu.id)
                );

                // On trie pour afficher dans l'ordre : Entrée, puis Plat, puis Dessert
                const ordre = ["Entrée", "Plat", "Dessert"];
                elementsDuMenu.sort((a, b) => ordre.indexOf(a.Type) - ordre.indexOf(b.Type));

                elementsDuMenu.forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${item.Type} :</strong> ${item.Nom}`;
                    list.appendChild(li);
                });
            }
        }
    });
}

// On lance le chargement quand la page est prête
document.addEventListener('DOMContentLoaded', () => {
    if (typeof init === "function") init(); // Lance tes autres fonctions (panier, etc.)
    initDynamicContent();
});
// ─────────────────────────────────────────────
//  Les Foodelles — script.js  (v3 Premium)
// ─────────────────────────────────────────────

// ── État global ──
let selections = {};
let panier     = [];

// ── Quantités souhaitées pour les menus (avant ajout au panier) ──
let menuQtys = {
  veggie: 1,
  ocean: 1,
  terroir: 1,
  exotique: 1,
  fitness: 1
};

// ── IDs des produits à quantité (boissons + cocktails) ──
const QTY_IDS = [
  'eau-plate','eau-gazeuse','jus-fruit','vin-blanc','champagne','cafe-the',
  'verrine-saumon','verrine-betterave','canape-foiegras',
  'bouchee-crevette','gougere','verrine-truffe'
];

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
function init() {
  restorePanier();
  restoreQty();
  initScrollHeader();
  initAvisSlider();
  initAvisAutoplay();
}

// ─────────────────────────────────────────────
//  SCROLL HEADER
// ─────────────────────────────────────────────
function initScrollHeader() {
  const header = document.getElementById('mainHeader');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ─────────────────────────────────────────────
//  MOBILE NAV
// ─────────────────────────────────────────────
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('open');
}

// ─────────────────────────────────────────────
//  PERSISTENCE
// ─────────────────────────────────────────────
function saveToStorage() {
  try { localStorage.setItem('foodelles_panier', JSON.stringify(panier)); } catch(e) {}
}

function saveQtyToStorage() {
  try {
    const qtys = {};
    QTY_IDS.forEach(id => {
      const el = document.getElementById('qty-' + id);
      if (el) qtys[id] = parseInt(el.textContent) || 0;
    });
    localStorage.setItem('foodelles_qty', JSON.stringify(qtys));
  } catch(e) {}
}

function restorePanier() {
  try {
    const saved = localStorage.getItem('foodelles_panier');
    if (saved) { panier = JSON.parse(saved); renderPanier(); }
  } catch(e) { panier = []; }
}

function restoreQty() {
  try {
    const saved = localStorage.getItem('foodelles_qty');
    if (!saved) return;
    const qtys = JSON.parse(saved);
    QTY_IDS.forEach(id => {
      const el = document.getElementById('qty-' + id);
      if (el && qtys[id] !== undefined) el.textContent = qtys[id];
    });
  } catch(e) {}
}

// ─────────────────────────────────────────────
//  ONGLETS THÈMES
// ─────────────────────────────────────────────
function switchTheme(theme, btn) {
  document.querySelectorAll('.theme-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + theme).classList.add('active');
}

// ─────────────────────────────────────────────
//  SÉLECTION D'UN ITEM
// ─────────────────────────────────────────────
function selectItem(theme, course, card, name, desc, img) {
  const section = card.closest('.course-section');
  section.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  if (!selections[theme]) selections[theme] = {};
  selections[theme][course] = { name, desc, img };

  const recapEl = document.getElementById('recap-' + theme + '-' + course);
  if (recapEl) {
    recapEl.classList.add('done');
    recapEl.querySelector('span').textContent = name;
  }

  const sel = selections[theme];
  const btn = document.getElementById('btn-' + theme);
  if (btn && sel.entree && sel.plat && sel.dessert) {
    btn.disabled = false;
    // Afficher le sélecteur de quantité
    const mqtyWrap = document.getElementById('mqty-' + theme);
    if (mqtyWrap) mqtyWrap.classList.add('visible');
  }
}

// ─────────────────────────────────────────────
//  QUANTITÉ MENU — contrôle (+/−) et saisie directe
// ─────────────────────────────────────────────
function changeMenuQty(theme, delta) {
  const current = menuQtys[theme] || 1;
  const newQty = Math.max(1, current + delta);
  menuQtys[theme] = newQty;

  const el = document.getElementById('menu-qty-' + theme);
  if (el) el.textContent = newQty;
}

function onMenuQtyKey(event, el, theme) {
  if (event.key === 'Enter') {
    event.preventDefault();
    el.blur();
  }
  if (!['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(event.key) && !/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

function onMenuQtyBlur(el, theme) {
  const val = Math.max(1, parseInt(el.textContent) || 1);
  menuQtys[theme] = val;
  el.textContent = val;
}

// ─────────────────────────────────────────────
//  AJOUTER UN MENU AU PANIER
// ─────────────────────────────────────────────
function addMenuToPanier(theme, themeName, unitPrice) {
  const sel = selections[theme];
  if (!sel || !sel.entree || !sel.plat || !sel.dessert) return;

  const qty = menuQtys[theme] || 1;

  // Chercher si ce combo exact est déjà dans le panier
  const existingIdx = panier.findIndex(p =>
    p.type === 'menu' &&
    p.theme === theme &&
    p.entree === sel.entree.name &&
    p.plat === sel.plat.name &&
    p.dessert === sel.dessert.name
  );

  if (existingIdx >= 0) {
    // Incrémenter la quantité existante
    panier[existingIdx].qty  = (panier[existingIdx].qty || 1) + qty;
    panier[existingIdx].price = unitPrice * panier[existingIdx].qty;
  } else {
    panier.push({
      id: Date.now(),
      type: 'menu',
      theme,
      themeName,
      unitPrice,
      price: unitPrice * qty,
      qty,
      entree:  sel.entree.name,
      plat:    sel.plat.name,
      dessert: sel.dessert.name,
    });
  }

  saveToStorage();
  renderPanier();
  const plural = qty > 1 ? ` ×${qty}` : '';
  showToast(`✅ Menu ${themeName}${plural} ajouté au panier !`);
}

// ─────────────────────────────────────────────
//  QUANTITÉ — contrôle (+/−) et saisie directe (boissons/cocktails)
// ─────────────────────────────────────────────
function changeQty(id, name, unitPrice, delta) {
  const el = document.getElementById('qty-' + id);
  if (!el) return;

  let qty = (parseInt(el.textContent) || 0) + delta;
  if (qty < 0) qty = 0;
  el.textContent = qty;

  _syncQtyToPanier(id, name, unitPrice, qty);
  saveQtyToStorage();
  saveToStorage();
  renderPanier();
}

function setQty(id, name, unitPrice, qty) {
  qty = Math.max(0, Math.floor(qty) || 0);
  const el = document.getElementById('qty-' + id);
  if (el) el.textContent = qty;
  _syncQtyToPanier(id, name, unitPrice, qty);
  saveQtyToStorage();
  saveToStorage();
  renderPanier();
}

function _syncQtyToPanier(id, name, unitPrice, qty) {
  const idx = panier.findIndex(p => p.type !== 'menu' && p.type !== 'service' && p.id === id);
  if (idx >= 0) {
    if (qty === 0) panier.splice(idx, 1);
    else { panier[idx].qty = qty; panier[idx].price = unitPrice * qty; }
  } else if (qty > 0) {
    panier.push({ id, type: 'produit', name, unitPrice, qty, price: unitPrice * qty });
  }
}

// Saisie directe au clavier
function onQtyKey(event, el, id, name, unitPrice) {
  if (event.key === 'Enter') {
    event.preventDefault();
    el.blur();
  }
  if (!['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(event.key) && !/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

function onQtyBlur(el, id, name, unitPrice) {
  const val = parseInt(el.textContent) || 0;
  setQty(id, name, unitPrice, val);
  el.textContent = val;
}

// ─────────────────────────────────────────────
//  SERVICE — toggle
// ─────────────────────────────────────────────
function toggleService(id, card, price) {
  card.classList.toggle('selected');
  const isSelected = card.classList.contains('selected');
  const name = card.querySelector('.service-name').textContent;
  const storageId = 'service-' + id;

  if (isSelected && price > 0) {
    if (!panier.find(p => p.id === storageId)) {
      panier.push({ id: storageId, type: 'service', name, price });
    }
  } else {
    panier = panier.filter(p => p.id !== storageId);
  }

  saveToStorage();
  renderPanier();
  if (isSelected) showToast('✅ ' + name + ' ajouté !');
}

// ─────────────────────────────────────────────
//  SUPPRIMER UNE LIGNE DU PANIER
// ─────────────────────────────────────────────
function removeLine(id) {
  const item = panier.find(p => String(p.id) === String(id));

  if (item && item.type === 'produit') {
    const el = document.getElementById('qty-' + item.id);
    if (el) el.textContent = 0;
    saveQtyToStorage();
  }

  if (item && item.type === 'service') {
    document.querySelectorAll('.service-card').forEach(card => {
      const nameEl = card.querySelector('.service-name');
      if (nameEl && nameEl.textContent === item.name) card.classList.remove('selected');
    });
  }

  panier = panier.filter(p => String(p.id) !== String(id));
  saveToStorage();
  renderPanier();
}

// Modifier quantité depuis le panier (contrôles inline)
function panierChangeQty(id, delta) {
  const item = panier.find(p => String(p.id) === String(id));
  if (!item) return;

  const newQty = (item.qty || 1) + delta;
  if (newQty <= 0) { removeLine(id); return; }

  item.qty   = newQty;
  item.price = item.unitPrice * newQty;

  // Sync display produits classiques
  const el = document.getElementById('qty-' + id);
  if (el) el.textContent = newQty;

  saveQtyToStorage();
  saveToStorage();
  renderPanier();
}

function panierSetQty(displayEl, id) {
  const item = panier.find(p => String(p.id) === String(id));
  if (!item) return;

  const newQty = Math.max(1, parseInt(displayEl.textContent) || 1);
  item.qty   = newQty;
  item.price = item.unitPrice * newQty;

  if (item.type === 'produit') {
    const extEl = document.getElementById('qty-' + id);
    if (extEl) extEl.textContent = newQty;
  }
  displayEl.textContent = newQty;

  saveQtyToStorage();
  saveToStorage();
  renderPanier();
}

// ─────────────────────────────────────────────
//  RENDU DU PANIER (sidebar)
// ─────────────────────────────────────────────
function renderPanier() {
  const lines   = document.getElementById('panierLines');
  const vide    = document.getElementById('panierVide');
  const countEl = document.getElementById('panierCount');

  lines.innerHTML = '';

  // Compter le total d'articles (somme des qty)
  const totalItems = panier.reduce((sum, p) => sum + (p.qty || 1), 0);
  countEl.textContent = totalItems;

  if (panier.length === 0) {
    vide.style.display = 'block';
  } else {
    vide.style.display = 'none';

    panier.forEach(item => {
      const div = document.createElement('div');
      div.className = 'panier-ligne';

      let emoji = '🍽️';
      let label = item.themeName ? 'Menu ' + item.themeName : item.name;
      let detailHTML = '';
      let qtyControlHTML = '';

      if (item.type === 'menu') {
        emoji = '🍽️';
        detailHTML = `Entrée : ${item.entree}<br>Plat : ${item.plat}<br>Dessert : ${item.dessert}`;
        // Contrôle quantité inline pour les menus également
        qtyControlHTML = `
          <div class="panier-qty-control">
            <button class="panier-qty-btn" onclick="panierChangeQty('${item.id}',-1)">−</button>
            <span class="panier-qty-display" contenteditable="true"
              onblur="panierSetQty(this,'${item.id}')"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()};if(!['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(event.key)&&!/^\\d$/.test(event.key)){event.preventDefault()}"
            >${item.qty || 1}</span>
            <button class="panier-qty-btn" onclick="panierChangeQty('${item.id}',1)">+</button>
            <span class="panier-qty-unit">pers.</span>
          </div>`;
      } else if (item.type === 'produit') {
        emoji = item.id.startsWith('verrine') || item.id.startsWith('canape') || item.id.startsWith('bouchee') || item.id.startsWith('gougere') ? '🥂' : '🥤';
        detailHTML = `${item.unitPrice.toFixed(2)} € × `;
        qtyControlHTML = `
          <div class="panier-qty-control">
            <button class="panier-qty-btn" onclick="panierChangeQty('${item.id}',-1)">−</button>
            <span class="panier-qty-display" contenteditable="true"
              onblur="panierSetQty(this,'${item.id}')"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
            >${item.qty}</span>
            <button class="panier-qty-btn" onclick="panierChangeQty('${item.id}',1)">+</button>
          </div>`;
      } else if (item.type === 'service') {
        emoji = '🎩';
        detailHTML = 'Prestation incluse dans la commande';
      }

      div.innerHTML = `
        <div class="panier-ligne-info" style="flex:1;min-width:0">
          <div class="panier-ligne-name">${emoji} ${label}</div>
          <div class="panier-ligne-detail">${detailHTML}</div>
          ${qtyControlHTML}
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;flex-shrink:0">
          <div class="panier-ligne-prix">${item.price.toFixed(2)} €</div>
          <button class="btn-remove" onclick="removeLine('${item.id}')" title="Supprimer">×</button>
        </div>
      `;
      lines.appendChild(div);
    });
  }

  // Totaux
  const totalTTC = panier.reduce((sum, p) => sum + p.price, 0);
  const tva      = totalTTC * 0.10 / 1.10;
  const totalHT  = totalTTC - tva;

  document.getElementById('totalHT').textContent  = totalHT.toFixed(2)  + ' €';
  document.getElementById('totalTVA').textContent = tva.toFixed(2)      + ' €';
  document.getElementById('totalTTC').textContent = totalTTC.toFixed(2) + ' €';
}

// ─────────────────────────────────────────────
//  SIDEBAR — toggle
// ─────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

// ─────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────
//  AVIS — SLIDER
// ─────────────────────────────────────────────
let avisIndex    = 0;
let avisTotal    = 0;
let avisAutoplay = null;

function initAvisSlider() {
  const track = document.getElementById('avisTrack');
  const dotsEl = document.getElementById('avisDots');
  if (!track || !dotsEl) return;

  avisTotal = track.querySelectorAll('.avis-card').length;

  // Build dots
  dotsEl.innerHTML = '';
  for (let i = 0; i < avisTotal; i++) {
    const dot = document.createElement('div');
    dot.className = 'avis-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => goToAvis(i);
    dotsEl.appendChild(dot);
  }

  updateAvis();
}

function slideAvis(dir) {
  avisIndex = (avisIndex + dir + avisTotal) % avisTotal;
  updateAvis();
  resetAutoplay();
}

function goToAvis(i) {
  avisIndex = i;
  updateAvis();
  resetAutoplay();
}

function updateAvis() {
  const track = document.getElementById('avisTrack');
  const cards = track ? track.querySelectorAll('.avis-card') : [];
  if (cards.length === 0) return;

  const cardWidth = cards[0].offsetWidth + 24; // gap = 24px
  track.style.transform = `translateX(-${avisIndex * cardWidth}px)`;
  track.style.transition = 'transform .5s cubic-bezier(.4,0,.2,1)';

  // Update dots
  document.querySelectorAll('.avis-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === avisIndex);
  });
}

function initAvisAutoplay() {
  avisAutoplay = setInterval(() => slideAvis(1), 5000);
}

function resetAutoplay() {
  clearInterval(avisAutoplay);
  avisAutoplay = setInterval(() => slideAvis(1), 5000);
}

window.addEventListener('resize', () => {
  updateAvis();
}, { passive: true });

// ─────────────────────────────────────────────
//  FINALISER LA COMMANDE
// ─────────────────────────────────────────────
async function commander() {
  if (panier.length === 0) {
    showToast('🛒 Votre panier est vide !');
    return;
  }

  let recapText = "NOUVELLE COMMANDE FOODELLES\n\nDétails :\n";
  panier.forEach(item => {
    if (item.type === 'menu') {
      recapText += `- Menu ${item.themeName} ×${item.qty || 1} : ${item.price.toFixed(2)}€\n  (${item.entree} / ${item.plat} / ${item.dessert})\n`;
    } else if (item.type === 'produit') {
      recapText += `- ${item.name} ×${item.qty} : ${item.price.toFixed(2)}€\n`;
    } else {
      recapText += `- ${item.name} : ${item.price.toFixed(2)}€\n`;
    }
  });
  recapText += `\nTOTAL TTC : ${document.getElementById('totalTTC').textContent}`;

  showToast('⏳ Traitement de la commande…');

  try {
    await fetch('https://formspree.io/f/mzdkdogg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sujet: "Nouvelle Commande Panier", detail: recapText })
    });
    window.location.href = "https://buy.stripe.com/";
  } catch (error) {
    showToast('❌ Erreur de connexion au service.');
  }
}

// ─────────────────────────────────────────────
//  FORMULAIRE DE CONTACT
// ─────────────────────────────────────────────
async function submitForm(e) {
  e.preventDefault(); // Empêche la redirection vers Formspree
  const btn = e.target.querySelector('.btn-submit');
  const originalText = btn.textContent;
  
  btn.textContent = "Envoi en cours..."; // Petit effet sympa
  btn.disabled = true;

  const formData = new FormData(e.target);

  try {
    const response = await fetch('https://formspree.io/f/mzdkdogg', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      showToast('📧 Votre demande a bien été envoyée !');
      e.target.reset();
    } else {
      showToast('❌ Erreur lors de l\'envoi.');
    }
  } catch (error) {
    showToast('❌ Problème de connexion.');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────
//  LANCEMENT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
