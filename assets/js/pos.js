// POS System JavaScript - Version avec magasin_stock en CDF/USD
console.log("SuperMarket Pro POS Système Chargé - Magasin Stock");

// Variables globales
let products = []; // Produits du magasin
let cart = new Map(); // Panier: key=id, value={product, qty}
let currentPayment = 'cash';
let discount = 0;
let currentCurrency = 'CDF'; // CDF ou USD
let TAUX_USD = 2400; // Taux de conversion (1 USD = X CDF)

const TAX_RATE = 0.10;
const $ = id => document.getElementById(id);

// Formatage des devises
const formatCDF = v => Math.round(v).toLocaleString('fr-FR') + ' FC';
const formatUSD = v => '$' + v.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
const formatMoney = v => currentCurrency === 'CDF' ? formatCDF(v) : formatUSD(v);

// État du stock
const stateFromStock = s => s > 10 ? 'ok' : (s > 0 ? 'low' : 'out');

// Chargement des données
async function loadTaux() {
    try {
        const response = await fetch('assets/Api/getTaux.php');
        const data = await response.json();
        if (data.success) {
            TAUX_USD = data.taux;
            $('taux-input').value = TAUX_USD;
            $('taux-display').textContent = `1$ = ${TAUX_USD} FC`;
        }
    } catch (error) {
        console.error('Erreur chargement taux:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch('assets/Api/getMagasinStock.php');
        const data = await response.json();
        if (data.products) {
            products = data.products.map(p => ({
                id: p.id,
                code: p.code,
                name: p.name,
                category: p.category,
                price_cdf: parseFloat(p.price_cdf),
                price_usd: parseFloat(p.price_usd),
                stock: p.quantity_magasin,
                quantity_stock: p.quantity_stock
            }));
            renderProducts();
        }
    } catch (error) {
        console.error('Erreur chargement produits:', error);
        alert('Erreur lors du chargement des produits');
    }
}

// Rendu des produits
function renderProducts(filterText = '', filterState = 'all') {
    const grid = $('productsGrid');
    grid.innerHTML = '';

    const list = products.filter(p => {
        const matchText = filterText.trim() === '' ||
            (p.code + ' ' + p.name + ' ' + (p.category || '')).toLowerCase().includes(filterText.toLowerCase());
        const st = stateFromStock(p.stock);
        const matchState = filterState === 'all' || filterState === st;
        return matchText && matchState;
    });

    list.forEach(p => {
        const div = document.createElement('div');
        div.className = 'card-product';
        const state = stateFromStock(p.stock);

        div.innerHTML = `
            <div class="prod-title">${p.name}</div>
            <div class="prod-meta">Réf: ${p.code}</div>
            <div class="prod-meta">
                ${formatCDF(p.price_cdf)} | ${formatUSD(p.price_usd)}
            </div>
            <div class="prod-meta">Stock: ${p.stock}
                ${p.stock <= 5 && p.stock > 0 ? '<span class="badge low">Bas</span>' : ''}
                ${p.stock === 0 ? '<span class="badge out">Rupture</span>' : ''}
            </div>
            <div class="prod-actions">
                <button class="btn" data-id="${p.id}" style="flex:1" ${p.stock === 0 ? 'disabled' : ''}>Ajouter</button>
            </div>
        `;
        grid.appendChild(div);
    });

    renderStockTable();
}

function renderStockTable() {
    const tbody = $('stockTable');
    tbody.innerHTML = '';

    products.slice(0, 20).forEach(p => {
        const tr = document.createElement('tr');
        const state = stateFromStock(p.stock);
        const price = currentCurrency === 'CDF' ? formatCDF(p.price_cdf) : formatUSD(p.price_usd);

        tr.innerHTML = `
            <td>${p.code}</td>
            <td>${p.name}</td>
            <td>${price}</td>
            <td>${p.stock}</td>
            <td>${state === 'ok' ? '<span class="badge ok">En stock</span>' :
                 state === 'low' ? '<span class="badge low">Bas</span>' :
                 '<span class="badge out">Rupture</span>'}</td>
            <td class="actions">
                <i class="fas fa-plus-circle" data-add="${p.id}" title="Ajouter au panier" style="cursor:pointer;color:var(--accent)"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Gestion du panier
function addToCart(id, qty = 1) {
    const product = products.find(p => p.id == id);
    if (!product) return alert('Produit introuvable');

    const currentQty = cart.has(id) ? cart.get(id).qty : 0;
    if (product.stock < currentQty + qty) {
        return alert('Stock insuffisant !');
    }

    cart.set(id, {product, qty: currentQty + qty});
    renderCart();
}

function removeFromCart(id) {
    cart.delete(id);
    renderCart();
}

function changeQty(id, qty) {
    if (qty <= 0) {
        removeFromCart(id);
        return;
    }

    const item = cart.get(id);
    if (item.product.stock < qty) {
        return alert('Stock insuffisant !');
    }

    cart.set(id, {...item, qty});
    renderCart();
}
function renderCart() {
    const list = $('cartList');
    list.innerHTML = '';

    let subtotal = 0;
    let count = 0;

    cart.forEach(({product, qty}, id) => {
        const row = document.createElement('div');
        row.className = 'cart-row';

        const priceUnit = currentCurrency === 'CDF' ? product.price_cdf : product.price_usd;
        const priceTotal = priceUnit * qty;

        row.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:600">${product.name}</div>
                <div class="small-muted">Réf: ${product.code}</div>
                <div class="small-muted">${formatMoney(priceUnit)} x ${qty}</div>
            </div>
            <div style="width:120px;text-align:right">
                <div style="font-weight:700">${formatMoney(priceTotal)}</div>
                <div class="qty">
                    <button data-dec="${id}">-</button>
                    <div style="width:28px;text-align:center">${qty}</div>
                    <button data-inc="${id}">+</button>
                </div>
                <div style="font-size:12px;margin-top:6px" class="small-muted">
                    <i title="Supprimer" data-remove="${id}" class="fas fa-trash" style="cursor:pointer"></i>
                </div>
            </div>
        `;
        list.appendChild(row);
        subtotal += priceTotal;
        count += qty;
    });

    // Calcul avec remise
    let discountAmount = 0;
    if (discount > 0) {
        discountAmount = subtotal * (discount / 100);
        subtotal -= discountAmount;
    }

    $('subtotal').textContent = formatMoney(subtotal);
    const tax = subtotal * TAX_RATE;
    $('tax').textContent = formatMoney(tax);
    const total = subtotal + tax;
    $('total').textContent = formatMoney(total);
    $('cart-count').textContent = `${count} article${count > 1 ? 's' : ''}`;

    // Calcul monnaie (si espèces)
    if (currentPayment === 'cash') {
        const amountRcv = parseFloat($('amount-received').value) || 0;
        const change = Math.max(0, amountRcv - total);
        $('change').textContent = formatMoney(change);
    }
}

// Encaissement
async function checkout() {
    if (cart.size === 0) return alert('Le panier est vide');

    // Vérification paiement espèces
    let amountRcv = 0;
    if (currentPayment === 'cash') {
        amountRcv = parseFloat($('amount-received').value) || 0;
        let subtotal = 0;
        cart.forEach(({product, qty}) => {
            const price = currentCurrency === 'CDF' ? product.price_cdf : product.price_usd;
            subtotal += price * qty;
        });
        if (discount > 0) subtotal -= subtotal * (discount / 100);
        const total = subtotal * (1 + TAX_RATE);

        if (amountRcv < total) return alert('Montant insuffisant !');
    }

    // Préparer les données de la vente
    const items = [];
    cart.forEach(({product, qty}) => {
        items.push({
            id: product.id,
            qty: qty,
            price_cdf: product.price_cdf,
            price_usd: product.price_usd
        });
    });

    const saleData = {
        items: items,
        payment_mode: currentPayment,
        currency: currentCurrency,
        discount: discount,
        amount_received: amountRcv
    };

    try {
        // Envoyer la vente au serveur
        const response = await fetch('assets/Api/createVente.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
        });

        const data = await response.json();

        if (!data.success) {
            alert('Erreur: ' + data.message);
            return;
        }

        // Générer ticket
        const receiptHtml = generateReceipt();
        $('receipt').innerHTML = receiptHtml;

        // Vider panier
        cart.clear();
        discount = 0;
        $('discount').value = '';
        $('amount-received').value = '';
        renderCart();

        // Recharger les produits pour mettre à jour le stock
        await loadProducts();

        alert('Vente enregistrée avec succès !');

    } catch (error) {
        console.error('Erreur lors de la vente:', error);
        alert('Erreur lors de l\'enregistrement de la vente');
    }
    html += '<h3 style="text-align:center">SuperMarket Pro</h3>';
    html += '<div style="text-align:center">CHRISTIANA NDODA MPAKA</div>';
    html += `<div style="text-align:center;font-size:12px">${now.toLocaleString('fr-FR')}</div><hr>`;

    let subtotal = 0;
    html += '<table style="width:100%;font-size:13px">';

    cart.forEach(({product, qty}) => {
        const price = currentCurrency === 'CDF' ? product.price_cdf : product.price_usd;
        const total = price * qty;
        html += `<tr><td>${product.name} x${qty}</td><td style="text-align:right">${formatMoney(total)}</td></tr>`;
        subtotal += total;
    });

    html += '</table><hr>';

    if (discount > 0) {
        const discountAmount = subtotal * (discount / 100);
        html += `<div>Remise (${discount}%): -${formatMoney(discountAmount)}</div>`;
        subtotal -= discountAmount;
    }

    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    html += `<div style="display:flex;justify-content:space-between"><span>Sous-total:</span><span>${formatMoney(subtotal)}</span></div>`;
    html += `<div style="display:flex;justify-content:space-between"><span>TVA (10%):</span><span>${formatMoney(tax)}</span></div>`;
    html += `<div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;margin-top:8px"><span>Total:</span><span>${formatMoney(total)}</span></div>`;
    html += `<div style="margin-top:12px">Mode: ${currentPayment.toUpperCase()} | Devise: ${currentCurrency}</div>`;

    if (currentPayment === 'cash') {
        const amountRcv = parseFloat($('amount-received').value) || 0;
        const change = Math.max(0, amountRcv - total);
        html += `<div>Reçu: ${formatMoney(amountRcv)}</div>`;
        html += `<div>Monnaie: ${formatMoney(change)}</div>`;
    }

    html += '<p style="text-align:center;margin-top:10px;font-size:12px">Merci pour votre achat !</p></div>';
    return html;
}

// Impression
function printReceipt() {
    const html = $('receipt').innerHTML || generateReceipt();
    const w = window.open('', 'PRINT', 'height=600,width=400');
    w.document.write('<html><head><title>Ticket</title></head><body>');
    w.document.write(html);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    w.print();
    w.close();
}

// Export CSV
function exportCSV() {
    let csv = 'Réf;Désignation;Prix CDF;Prix USD;Stock\n';
    products.forEach(p => csv += `${p.code};${p.name};${p.price_cdf};${p.price_usd};${p.stock}\n`);
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_magasin_export.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 1000);
}

// Mise à jour du taux
async function updateTaux() {
    const newTaux = parseFloat($('taux-input').value);
    if (!newTaux || newTaux <= 0) {
        return alert('Taux invalide');
    }

    try {
        const formData = new FormData();
        formData.append('taux', newTaux);

        const response = await fetch('assets/Api/updateTaux.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            TAUX_USD = newTaux;
            $('taux-display').textContent = `1$ = ${TAUX_USD} FC`;
            alert('Taux mis à jour avec succès');
            await loadProducts(); // Recharger pour recalculer les prix
            renderCart(); // Recalculer le panier
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur mise à jour taux:', error);
        alert('Erreur lors de la mise à jour du taux');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initialisation POS...');

    $('year').textContent = new Date().getFullYear();
    updateTime();
    setInterval(updateTime, 60000);

    // Charger le taux et les produits
    await loadTaux();
    await loadProducts();
    renderCart();

    // Bouton déconnexion
    $('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            localStorage.removeItem('user');
            fetch('assets/Api/logout.php', {method: 'POST'}).catch(() => {});
            window.location.href = 'index.html';
        }
    });

    // Mise à jour du taux
    $('btn-update-taux').addEventListener('click', updateTaux);

    // Sélection de la devise
    document.querySelectorAll('[data-currency]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-currency]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCurrency = btn.dataset.currency;
            renderProducts($('search').value, $('filter-stock').value);
            renderCart();
        });
    });

    // Sélection mode de paiement
    document.querySelectorAll('[data-payment]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-payment]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPayment = btn.dataset.payment;
            $('cash-section').style.display = currentPayment === 'cash' ? 'block' : 'none';
        });
    });

    // Montant reçu -> monnaie
    $('amount-received').addEventListener('input', renderCart);

    // Appliquer remise
    $('btn-apply-discount').addEventListener('click', () => {
        const discountValue = parseFloat($('discount').value) || 0;
        if (discountValue < 0 || discountValue > 100) return alert('Remise invalide (0-100%)');
        discount = discountValue;
        renderCart();
        alert(`Remise de ${discount}% appliquée`);
    });

    // Délégation d'événements
    document.body.addEventListener('click', e => {
        // Ajouter au panier depuis la grille
        if (e.target.matches('.card-product .btn') || e.target.closest('.card-product .btn')) {
            const btn = e.target.closest('button');
            const id = btn.dataset.id;
            if (id) addToCart(id);
        }

        // Ajouter depuis le tableau
        if (e.target.dataset.add) {
            addToCart(e.target.dataset.add);
        }

        // Incrémenter quantité
        if (e.target.dataset.inc) {
            const id = e.target.dataset.inc;
            const item = cart.get(id);
            if (item) changeQty(id, item.qty + 1);
        }

        // Décrémenter quantité
        if (e.target.dataset.dec) {
            const id = e.target.dataset.dec;
            const item = cart.get(id);
            if (item) changeQty(id, item.qty - 1);
        }

        // Supprimer du panier
        if (e.target.dataset.remove) {
            removeFromCart(e.target.dataset.remove);
        }
    });

// Recherche et filtres
    $('search').addEventListener('input', e => renderProducts(e.target.value, $('filter-stock').value));
    $('filter-stock').addEventListener('change', e => renderProducts($('search').value, e.target.value));

    // Scanner code-barre
    $('btn-scan').addEventListener('click', () => {
        const code = $('barcode').value.trim();
        if (!code) return;
        const p = products.find(x => x.code === code);
        if (p) addToCart(p.id);
        else alert('Produit non trouvé');
        $('barcode').value = '';
    });

    $('barcode').addEventListener('keydown', e => {
        if (e.key === 'Enter') $('btn-scan').click();
    });

    // Actions checkout
    $('btn-checkout').addEventListener('click', checkout);

    $('btn-clear-cart').addEventListener('click', () => {
        if (confirm('Vider le panier ?')) {
            cart.clear();
            discount = 0;
            $('discount').value = '';
            $('amount-received').value = '';
            renderCart();
        }
    });

    $('btn-print').addEventListener('click', printReceipt);

    $('btn-save-draft').addEventListener('click', () => {
        const data = Array.from(cart.entries());
        localStorage.setItem('pos_draft', JSON.stringify(data));
        alert('Brouillon sauvegardé');
    });

    $('btn-export').addEventListener('click', exportCSV);

    $('btn-reset').addEventListener('click', async () => {
        if (confirm('Recharger les données du magasin ?')) {
            cart.clear();
            discount = 0;
            await loadProducts();
            renderCart();
        }
    });

    console.log('POS initialisé avec succès');
});

function updateTime() {
    $('currentTime').textContent = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
