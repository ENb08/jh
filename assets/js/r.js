// ===== DONNÉES GLOBALES =====
let products = [];      // Liste de tous les produits
let depots = [];        // Laissé pour éviter les erreurs, mais non utilisé
let movements = [];     // Liste de tous les mouvements
let history = [];       // Laissé pour éviter les erreurs, mais non utilisé
let magasinStock = [];  // Stock du magasin 1 (depot_magasin)
let magasinSummary = {}; // Résumé des statistiques du magasin

// ===== UTILITAIRES RACCOURCIS =====
const $ = id => document.getElementById(id);

// IMPORTANT : respecte la casse exacte du dossier sur le serveur (ici "Api" avec A majuscule)
const API_BASE = 'https://etsjh.com/assets/Api';

// Fonction pour formater en CDF
const formatCDF = v => parseFloat(v).toLocaleString('fr-FR', {minimumFractionDigits:0, maximumFractionDigits:0}) + ' FC';

// Fonction pour formater en USD
const formatUSD = v => '$' + parseFloat(v).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});

// Fonction pour formater un nombre en format monétaire français (mise à jour pour CDF)
const formatMoney = v => parseFloat(v).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' CDF';

// Taux de conversion CDF vers USD utilisé dans renderProducts
const TAUX_USD = 2400;

// ===== APPELS API (REQUÊTES À LA BASE DE DONNÉES) =====

/**
 * Construit une URL propre sans double slash en combinant l'API_BASE et l'endpoint.
 */
function buildUrl(endpoint = '') {
  const base = String(API_BASE).replace(/\/+$/, '');          // supprime slash final
  const ep = String(endpoint).replace(/^\/+/, '');           // supprime slash initial
  return ep === '' ? base : `${base}/${ep}`;
}

/**
 * Récupère les données depuis l'API PHP
 * CORRECTION APPLIQUÉE : Utilise toujours buildUrl pour empêcher le doublement de l'API_BASE.
 */
async function fetchData(endpoint) {
  const url = buildUrl(endpoint); // Utilisation correcte pour éviter le doublon d'URL
  console.log('GET', url);
  try {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('HTTP error', response.status, text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur fetch:', error);
    alert('Erreur de connexion à la base de données (voir console)');
    return null;
  }
}

/**
 * Charge tous les produits depuis la base de données et rafraîchit l'interface
 */
async function loadProducts() {
    const data = await fetchData('produit.php');
    if (data) products = data;
    renderProducts();
    updateProductSelect(); // Met à jour la liste déroulante d'ajout de stock
    updateProductSelectForMovement(); // Met à jour la liste déroulante de nouveau mouvement
    updateProductSelectForAppro(); // Met à jour la liste déroulante d'approvisionnement magasin
}

// Fonctions laissées pour la compatibilité, mais sans corps spécifique ici
async function loadDepots() {}
async function loadHistory() {}

/**
 * Charge le stock du Magasin 1
 */
async function loadMagasinStock() {
    const data = await fetchData('getMagasinStock.php');
    if (data) {
        magasinStock = data.products || [];
        magasinSummary = data.summary || {};
        renderMagasinStock();
        updateMagasinStats();
    }
}

/**
 * Charge tous les mouvements depuis la base de données
 */
async function loadMovements() {
    const data = await fetchData('getMovements.php');
    if (data) {
        movements = data;
        renderMovements();
    }
}

/**
 * Charge et affiche les alertes de stock
 */
async function loadAlerts() {
    const alertsList = $('alertsList');
    if (!alertsList) return;

    alertsList.innerHTML = '';

    // Générer les alertes basées sur les produits
    products.forEach(p => {
        const totalStock = getTotalStock(p.id);
        // Utiliser la valeur de l'API qui est une chaîne
        const threshold = parseInt(p.alert_threshold) || 5;

        if (totalStock === 0) {
            const alert = createAlertElement('critical', p.name, `Rupture de stock (Stock: 0)`, p.id);
            alertsList.appendChild(alert);
        } else if (totalStock <= threshold) {
            const alert = createAlertElement('warning', p.name, `Stock bas (Stock: ${totalStock}, Seuil: ${threshold})`, p.id);
            alertsList.appendChild(alert);
        }
    });

    if (alertsList.children.length === 0) {
        alertsList.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">✅ Aucune alerte. Tous les stocks sont corrects.</div>';
    }
}

/**
 * Crée un élément d'alerte
 */
function createAlertElement(type, productName, message, productId) {
    const div = document.createElement('div');
    div.className = `alert-item alert-${type}`;
    div.style.cssText = 'padding:12px;border-left:4px solid;border-radius:4px;background:#f9f9f9;';

    if (type === 'critical') {
        div.style.borderLeftColor = 'var(--danger)';
    } else {
        div.style.borderLeftColor = 'var(--warning)';
    }

    div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <strong>${productName}</strong>
                <div style="font-size:13px;color:#666;margin-top:4px;">${message}</div>
            </div>
            <i class="fas fa-${type === 'critical' ? 'exclamation-circle' : 'exclamation-triangle'}" style="color:${type === 'critical' ? 'var(--danger)' : 'var(--warning)'};font-size:20px;"></i>
        </div>
    `;

    return div;
}

// ===== FONCTIONS UTILITAIRES DE LOGIQUE =====

/**
 * Détermine l'état du stock d'un produit
 */
function getProductState(id) {
    const p = products.find(x => x.id == id);
    if (!p) return 'unknown';

    // Conversion en nombre des valeurs de stock de l'API (chaînes)
    const total = (parseInt(p.depot_principal || 0) || 0) + (parseInt(p.depot_reserve || 0) || 0) + (parseInt(p.depot_vitrine || 0) || 0);

    // Conversion en nombre de la valeur de seuil
    const threshold = parseInt(p.alert_threshold) || 0;

    return total === 0 ? 'critical' : total <= threshold ? 'low' : 'ok';
}

/**
 * Calcule le stock total d'un produit dans tous les dépôts
 */
function getTotalStock(id) {
    const p = products.find(x => x.id == id);
    if (!p) return 0;
    // Conversion en nombre des valeurs de stock de l'API (chaînes)
    return (parseInt(p.depot_principal || 0) || 0) + (parseInt(p.depot_reserve || 0) || 0) + (parseInt(p.depot_vitrine || 0) || 0);
}

// ===== FONCTIONS D'AFFICHAGE (RENDER) =====

/**
 * Met à jour la liste déroulante de sélection des produits dans la modale d'ajout de stock
 */
function updateProductSelect() {
    const select = $('id_produit');
    if (!select) return;
    select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `[${p.code}] ${p.name} (Stock: ${getTotalStock(p.id)})`;
        select.appendChild(option);
    });
}

/**
 * Affiche les informations du produit sélectionné dans la modale d'ajout de stock
 */
function renderAddStockInfo(productId) {
    const infoPanel = $('as-product-info');
    if (!infoPanel) return;
    const p = products.find(x => x.id == productId);

    if (p) {
        infoPanel.style.display = 'block';
        $('as-current-stock').textContent = getTotalStock(p.id);
        // Utiliser formatMoney (CDF) comme dans la première version
        $('as-current-buy-price').textContent = formatMoney(p.buy_price);
        $('as-current-sale-price').textContent = formatMoney(p.sale_price);

        // Pré-remplir et indiquer le prix comme dans la seconde version
        if ($('as-new-buy-price')) $('as-new-buy-price').value = parseFloat(p.buy_price).toFixed(2);
        if ($('as-new-sale-price')) $('as-new-sale-price').placeholder = `0.00 (actuel: ${formatMoney(p.sale_price)})`;
    } else {
        infoPanel.style.display = 'none';
        if ($('as-new-buy-price')) $('as-new-buy-price').value = '';
        if ($('as-new-sale-price')) $('as-new-sale-price').value = '';
    }
}

/**
 * Met à jour la liste déroulante de sélection des produits dans la modale de nouveau mouvement
 */
function updateProductSelectForMovement() {
    const select = $('nm-product');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `[${p.code}] ${p.name} (Stock: ${getTotalStock(p.id)})`;
        select.appendChild(option);
    });
}

/**
 * Met à jour la liste déroulante pour l'approvisionnement du magasin
 */
function updateProductSelectForAppro() {
    const select = $('am-product');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

    products.forEach(p => {
        // Le stock principal est souvent utilisé pour l'approvisionnement du magasin
        const stockPrincipal = parseInt(p.depot_principal || 0);
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `[${p.code}] ${p.name} (Stock disponible: ${stockPrincipal})`;
        option.setAttribute('data-stock', stockPrincipal);
        select.appendChild(option);
    });
}


/**
 * Affiche la liste des produits dans le tableau (Version avec CDF/USD)
 */
function renderProducts(searchText = '', filterState = '', filterDepot = '') {
    const tbody = $('productsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    let total = 0, valueCDF = 0, low = 0, critical = 0;

    products.forEach(p => {
        const matchSearch = searchText === '' ||
            (String(p.code) + ' ' + String(p.name) + ' ' + String(p.category))
            .toLowerCase()
            .includes(searchText.toLowerCase());

        const state = getProductState(p.id);
        const matchState = filterState === '' || filterState === state;

        if (!matchSearch || !matchState) return;

        total++;
        const totalStock = getTotalStock(p.id);
        const prixAchat = parseFloat(p.buy_price || 0);
        const prixVente = parseFloat(p.sale_price || 0);

        // Calcul de la valeur totale en CDF
        valueCDF += totalStock * prixAchat;

        if (state === 'critical') critical++;
        if (state === 'low') low++;

        // Conversion des prix en USD
        const prixAchatUSD = prixAchat / TAUX_USD;
        const prixVenteUSD = prixVente / TAUX_USD;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td>${p.name}</td>
            <td><span class="badge info">${p.category}</span></td>
            <td>
                <div>${formatCDF(prixAchat)}</div>
                <small style="color:#666;">${formatUSD(prixAchatUSD)}</small>
            </td>
            <td>
                <div>${formatCDF(prixVente)}</div>
                <small style="color:#666;">${formatUSD(prixVenteUSD)}</small>
            </td>
            <td style="text-align:center;font-weight:600">${p.depot_principal || 0}</td>
            <td style="text-align:center">${p.depot_vitrine || 0}</td>
            <td>${state === 'ok' ? '<span class="badge ok">En stock</span>' : state === 'low' ? '<span class="badge low">Bas</span>' : '<span class="badge critical">Rupture</span>'}</td>
            <td>
                <i class="fas fa-edit" data-edit="${p.id}" style="cursor:pointer;margin-right:8px" title="Modifier"></i>
                <i class="fas fa-trash" data-del="${p.id}" style="cursor:pointer;color:var(--danger)" title="Supprimer"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Calcul de la valeur totale en USD
    const valueUSD = valueCDF / TAUX_USD;

    // Met à jour les statistiques affichées
    const statTotal = $('stat-total'); if (statTotal) statTotal.textContent = products.length;

    // Affichage de la valeur en CDF et USD
    const statValueElement = $('stat-value');
    if (statValueElement) {
        statValueElement.innerHTML = `
            <div>${formatCDF(valueCDF)}</div>
            <small style="font-size:12px;font-weight:normal;">${formatUSD(valueUSD)}</small>
        `;
    }

    const statLow = $('stat-low'); if (statLow) statLow.textContent = low;
    const statCritical = $('stat-critical'); if (statCritical) statCritical.textContent = critical;
}

/**
 * Affiche la liste des mouvements dans le tableau
 */
function renderMovements() {
    const tbody = $('movementsTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#666;">Aucun mouvement enregistré</td></tr>';
        return;
    }

    movements.forEach(m => {
        const tr = document.createElement('tr');

        // Déterminer le type de badge et l'icône
        let typeLabel = '';
        let depotInfo = '';

        switch(m.type) {
            case 'entree':
                typeLabel = '<span class="badge ok"><i class="fas fa-arrow-down"></i> Entrée</span>';
                depotInfo = m.depot_to || '-';
                break;
            case 'sortie':
                typeLabel = '<span class="badge warning"><i class="fas fa-arrow-up"></i> Sortie</span>';
                depotInfo = m.depot_from || '-';
                break;
            case 'transfert':
                typeLabel = '<span class="badge info"><i class="fas fa-exchange-alt"></i> Transfert</span>';
                depotInfo = `${m.depot_from || '?'} → ${m.depot_to || '?'}`;
                break;
            case 'ajustement':
                typeLabel = '<span class="badge"><i class="fas fa-balance-scale"></i> Ajustement</span>';
                depotInfo = m.depot_from || '-';
                break;
            case 'retour':
                typeLabel = '<span class="badge info"><i class="fas fa-undo"></i> Retour</span>';
                depotInfo = m.depot_to || '-';
                break;
            case 'perte':
                typeLabel = '<span class="badge critical"><i class="fas fa-times"></i> Perte/Casse</span>';
                depotInfo = m.depot_from || '-';
                break;
            default:
                typeLabel = `<span class="badge">${m.type}</span>`;
                depotInfo = '-';
        }

        // Formater la date
        const dateFormatted = new Date(m.date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        tr.innerHTML = `
            <td><small>${dateFormatted}</small></td>
            <td>${typeLabel}</td>
            <td><strong>${m.product_name || 'Produit inconnu'}</strong><br><small style="color:#666;">${m.product_code || ''}</small></td>
            <td style="text-align:center;font-weight:600;">${m.variation >= 0 ? '+' : ''}${m.variation}</td>
            <td><small>${depotInfo}</small></td>
            <td><small>${m.reference || '-'}</small></td>
            <td><small>${m.notes || '-'}</small></td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * Affiche le stock du Magasin 1
 */
function renderMagasinStock() {
    const tbody = $('magasinTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (magasinStock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#666;">Aucun produit disponible</td></tr>';
        return;
    }

    magasinStock.forEach(p => {
        const tr = document.createElement('tr');

        const rowStyle = p.quantity_magasin <= 0 ? 'opacity:0.5;' : '';

        tr.innerHTML = `
            <td style="${rowStyle}"><strong>${p.code}</strong></td>
            <td style="${rowStyle}">${p.name}</td>
            <td style="${rowStyle}"><span class="badge info">${p.category}</span></td>
            <td style="${rowStyle}">${formatCDF(p.price_cdf)}</td>
            <td style="${rowStyle}">${formatUSD(p.price_usd)}</td>
            <td style="text-align:center;font-weight:600;font-size:16px;${rowStyle}">
                ${p.quantity_magasin > 0 ? p.quantity_magasin : '<span style="color:#999;">0</span>'}
            </td>
            <td style="font-weight:600;${rowStyle}">${p.quantity_magasin > 0 ? formatCDF(p.value_cdf) : '-'}</td>
            <td style="font-weight:600;${rowStyle}">${p.quantity_magasin > 0 ? formatUSD(p.value_usd) : '-'}</td>
            <td>
                ${p.quantity_magasin > 0 ? `
                    <i class="fas fa-minus-circle" data-reduce="${p.id}" style="cursor:pointer;color:var(--warning);margin-right:8px" title="Réduire"></i>
                    <i class="fas fa-info-circle" data-info="${p.id}" style="cursor:pointer;color:var(--accent)" title="Détails"></i>
                ` : `<i class="fas fa-plus-circle" data-appro="${p.id}" style="cursor:pointer;color:var(--success)" title="Approvisionner"></i>`}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * Met à jour les statistiques du magasin
 */
function updateMagasinStats() {
    if (!magasinSummary) return;

    const totalItems = $('mag-total-items');
    const valueCDF = $('mag-value-cdf');
    const valueUSD = $('mag-value-usd');
    const totalProducts = $('mag-total-products');

    if (totalItems) totalItems.textContent = magasinSummary.total_items || 0;
    if (valueCDF) valueCDF.textContent = formatCDF(magasinSummary.total_value_cdf || 0);
    if (valueUSD) valueUSD.textContent = formatUSD(magasinSummary.total_value_usd || 0);
    if (totalProducts) totalProducts.textContent = magasinSummary.total_products || 0;
}

// ===== FONCTIONS D'ENREGISTREMENT (SAVE) =====

/**
 * Ajoute un nouveau produit à la base de données (Version avec validations strictes)
 */
async function saveProduct(code, name, category, buyPrice, salePrice, alertThreshold, initial) {
    // Validation du code/référence
    if (!code || code.trim() === '') {
        alert('❌ Erreur: Veuillez entrer une référence/code');
        return false;
    }
    if (code.length < 2 || code.length > 50) {
        alert('❌ Erreur: La référence doit contenir entre 2 et 50 caractères');
        return false;
    }
    // Validation du nom
    if (!name || name.trim() === '') {
        alert('❌ Erreur: Veuillez entrer un nom de produit');
        return false;
    }
    if (name.length < 3 || name.length > 100) {
        alert('❌ Erreur: Le nom du produit doit contenir entre 3 et 100 caractères');
        return false;
    }
    // Validation de la catégorie
    if (!category || category.trim() === '') {
        alert('❌ Erreur: Veuillez sélectionner une catégorie');
        return false;
    }
    // Validation des prix
    const bP = parseFloat(buyPrice);
    const sP = parseFloat(salePrice);
    if (isNaN(bP) || bP <= 0 || bP > 999999.99) {
        alert('❌ Erreur: Prix d\'achat invalide ou nul');
        return false;
    }
    if (isNaN(sP) || sP <= 0 || sP > 999999.99) {
        alert('❌ Erreur: Prix de vente invalide ou nul');
        return false;
    }
    if (sP < bP) {
        alert('❌ Erreur: Le prix de vente doit être supérieur ou égal au prix d\'achat');
        return false;
    }
    // Validation du seuil
    const aT = parseInt(alertThreshold);
    if (isNaN(aT) || aT < 0 || aT > 99999) {
        alert('❌ Erreur: Seuil d\'alerte invalide');
        return false;
    }
    // Validation du stock initial
    const init = parseInt(initial);
    if (isNaN(init) || init < 0 || init > 99999) {
        alert('❌ Erreur: Stock initial invalide');
        return false;
    }

    const formData = new FormData();
    formData.append('reference', code.trim());
    formData.append('nom_produit', name.trim());
    formData.append('categorie', category.trim());
    formData.append('Prix_Achat', bP);
    formData.append('Prix_Vente', sP);
    formData.append('Seuil_Alerte', aT);
    formData.append('Stock_Initial', init);

    try {
        const resp = await fetch(buildUrl('addProduct.php'), {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        if (!resp.ok) {
            const txt = await resp.text().catch(()=>'');
            console.error('Erreur HTTP saveProduct:', resp.status, txt);
            alert('Erreur serveur lors de l ajout du produit (voir console)');
            return false;
        }
        const result = await resp.json();
        if (result.success) {
            alert('✅ Produit ajouté avec succès');
            // Reset et reload
            const modal = $('modalNewProduct'); if (modal) modal.classList.remove('show');
            if (modal) modal.querySelector('form').reset();
            loadProducts();
            return true;
        } else {
            alert('❌ Erreur: ' + result.message);
            console.error('Erreur API:', result);
            return false;
        }
    } catch (error) {
        console.error('Erreur saveProduct:', error);
        alert('Erreur réseau lors de l ajout du produit');
        return false;
    }
}


/**
 * Enregistre une entrée de stock (Ajout de Stock) (Version complète)
 */
async function saveMovement(productId, quantity, depot, newBuyPrice, newSalePrice, note) {
    // ===== VALIDATIONS DU MOUVEMENT DE STOCK =====
    if (!productId) {
        alert('❌ Erreur: Veuillez sélectionner un produit.');
        return false;
    }

    const q = parseInt(quantity);
    if (isNaN(q) || q <= 0) {
        alert('❌ Erreur: La quantité doit être un nombre positif.');
        return false;
    }

    if (!depot || (depot !== 'principal' && depot !== 'reserve' && depot !== 'vitrine')) {
        alert('❌ Erreur: Veuillez sélectionner un dépôt valide.');
        return false;
    }

    const newBP = parseFloat(newBuyPrice);
    if (isNaN(newBP) || newBP <= 0 || newBP > 999999.99) {
        alert('❌ Erreur: Le prix d\'achat doit être un nombre positif.');
        return false;
    }

    let newSP = null;
    if (newSalePrice && newSalePrice.trim() !== "") {
        newSP = parseFloat(newSalePrice);
        if (isNaN(newSP) || newSP <= 0 || newSP > 999999.99) {
             alert('❌ Erreur: Le prix de vente optionnel est invalide.');
             return false;
        }
        if (newSP < newBP) {
            alert('❌ Erreur: Le nouveau prix de vente doit être supérieur ou égal au nouveau prix d\'achat.');
            return false;
        }
    }

    if (note.length > 255) {
        alert('❌ Erreur: La note ne doit pas dépasser 255 caractères.');
        return false;
    }

    // Création du FormData pour l'API
    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('type', 'IN'); // Type : Entrée (IN)
    formData.append('quantity', q);
    formData.append('depot', depot);
    formData.append('buy_price', newBP);
    if (newSP !== null) {
        formData.append('sale_price', newSP);
    }
    formData.append('note', note.trim());

    try {
        const response = await fetch(buildUrl('addMovement.php'), {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Entrée de ${q} unités enregistrée avec succès.`);

            // Réinitialisation et fermeture
            const modal = $('modalAddStock'); if (modal) modal.classList.remove('show');
            if (modal) modal.querySelector('form').reset(); // Reset complet du formulaire
            $('id_produit').value = ''; // Réinitialiser manuellement le select

            // Masquer le panneau d'info
            $('as-product-info').style.display = 'none';

            // Recharger les données pour mettre à jour le catalogue
            loadProducts();
            loadMovements();
            loadAlerts();
            return true;
        } else {
            alert('❌ Erreur lors de l\'enregistrement du mouvement: ' + result.message);
            console.error('Erreur API:', result);
            return false;
        }

    } catch (error) {
        console.error('❌ Erreur réseau lors de l\'enregistrement du mouvement:', error);
        alert('❌ Erreur de communication avec le serveur.');
        return false;
    }
}


// ===== INITIALISATION ET ÉVÉNEMENTS =====

document.addEventListener('DOMContentLoaded', () => {
    // Affiche l'année actuelle au pied de page
    const elYear = $('year'); if (elYear) elYear.textContent = new Date().getFullYear();

    // Charge les produits et dépôts pour l'affichage initial du catalogue et des autres onglets
    loadProducts();
    loadMovements();
    loadAlerts();
    loadMagasinStock();

    // Vérifier et afficher les messages d'alerte depuis l'URL (ajout de script_stock (1).js)
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const message = urlParams.get('msg');

    if (status && message) {
        const decodedMessage = decodeURIComponent(message);
        alert(decodedMessage);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // GESTION DES ONGLETS
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabName = btn.dataset.tab;

            document.querySelectorAll('[role="tabpanel"]').forEach(p => p.style.display = 'none');
            const target = $('tab-' + tabName); if (target) target.style.display = 'block';

            // Charger les données selon l'onglet
            if (tabName === 'movements') {
                loadMovements();
            } else if (tabName === 'alerts') {
                loadAlerts();
            } else if (tabName === 'magasin') {
                loadMagasinStock();
            }
        });
    });

    // MODALES
    function openModal(id) { const el = $(id); if (el) el.classList.add('show'); }
    function closeModal(id) {
        const el = $(id);
        if (el) {
            el.classList.remove('show');
            const form = el.querySelector('form');
            if (form) form.reset();

            // Réinitialisation spécifique pour l'ajout de stock
            if (id === 'modalAddStock') {
                 const pid = $('id_produit'); if (pid) pid.value = ''; // ID du select
                 const info = $('as-product-info'); if (info) info.style.display = 'none';
            }
        }
    }

    document.querySelectorAll('[data-close]').forEach(btn => { btn.addEventListener('click', () => closeModal(btn.dataset.close)); });
    document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); }); });

    // ÉVÉNEMENTS BOUTONS (Nouveau Produit)
    const btnNew = $('btn-new-product'); if (btnNew) btnNew.addEventListener('click', () => openModal('modalNewProduct'));
    const npSave = $('np-save'); if (npSave) npSave.addEventListener('click', async (e) => {
        e.preventDefault();
        await saveProduct(
          $('np-code') ? $('np-code').value : '',
          $('np-name') ? $('np-name').value : '',
          $('np-category') ? $('np-category').value : '',
          $('np-buy') ? $('np-buy').value : '',
          $('np-sale') ? $('np-sale').value : '',
          $('np-alert') ? $('np-alert').value : '5',
          $('np-initial') ? $('np-initial').value : '0'
        );
    });

    // ÉVÉNEMENTS BOUTONS (Ajout de Stock / Entrée)
    const btnAddStock = $('btn-add-stock');
    if (btnAddStock) {
        btnAddStock.addEventListener('click', () => {
            openModal('modalAddStock');
            // Utiliser 'id_produit' du select dans la modale
            renderAddStockInfo($('id_produit') ? $('id_produit').value : '');
        });
    }

    // Changement de produit dans la modale d'ajout de stock
    const selectAddStock = $('id_produit');
    if (selectAddStock) {
        selectAddStock.addEventListener('change', e => {
            renderAddStockInfo(e.target.value);
        });
    }

    // Bouton: Enregistrer l'entrée de stock
    const asSave = $('as-save');
    if (asSave) {
        asSave.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = $('id_produit') ? $('id_produit').value : '';
            const quantity = $('as-quantity') ? $('as-quantity').value : '';
            const depot = $('as-depot') ? $('as-depot').value : '';
            const newBuyPrice = $('as-new-buy-price') ? $('as-new-buy-price').value : '';
            const newSalePrice = $('as-new-sale-price') ? $('as-new-sale-price').value : '';
            const note = $('as-note') ? $('as-note').value : '';

            await saveMovement(productId, quantity, depot, newBuyPrice, newSalePrice, note);
        });
    }

    // Bouton: Nouveau Mouvement
    const btnNewMovement = $('btn-new-movement');
    if (btnNewMovement) btnNewMovement.addEventListener('click', () => {
        openModal('modalNewMovement');
        updateProductSelectForMovement();
    });

    // Bouton: Approvisionner Magasin
    const btnApproMagasin = $('btn-appro-magasin');
    if (btnApproMagasin) btnApproMagasin.addEventListener('click', () => {
        openModal('modalApproMagasin');
        updateProductSelectForAppro();
    });

    // Changement de produit dans l'approvisionnement magasin
    const amProduct = $('am-product');
    if (amProduct) {
        amProduct.addEventListener('change', (e) => {
            const productId = e.target.value;
            const infoPanel = $('am-product-info');

            if (!productId) {
                if (infoPanel) infoPanel.style.display = 'none';
                return;
            }

            const product = products.find(p => p.id == productId);
            const magProd = magasinStock.find(p => p.id == productId);

            if (product && infoPanel) {
                infoPanel.style.display = 'block';
                const stockPrincipal = parseInt(product.depot_principal || 0);
                const stockMagasin = magProd ? magProd.quantity_magasin : 0;

                const amStockPrincipal = $('am-stock-principal');
                const amStockMagasin = $('am-stock-magasin');
                const qtyInput = $('am-qty');

                if (amStockPrincipal) amStockPrincipal.textContent = stockPrincipal;
                if (amStockMagasin) amStockMagasin.textContent = stockMagasin;

                // Limiter la quantité max au stock disponible
                if (qtyInput) qtyInput.max = stockPrincipal;
            }
        });
    }

    // ÉVÉNEMENTS DE RECHERCHE ET FILTRES
    const searchInput = $('search');
    const filterState = $('filter-state');
    const filterDepot = $('filter-depot');

    // Fonction de rendu unifiée pour les filtres
    const unifiedRender = () => {
        renderProducts(
            searchInput ? searchInput.value : '',
            filterState ? filterState.value : '',
            filterDepot ? filterDepot.value : ''
        );
    };

    if (searchInput) searchInput.addEventListener('input', unifiedRender);
    if (filterState) filterState.addEventListener('change', unifiedRender);
    if (filterDepot) filterDepot.addEventListener('change', unifiedRender);


    // ÉVÉNEMENTS DÉLÉGUÉS DU TABLEAU
    document.body.addEventListener('click', async e => {
        const delId = e.target.dataset.del;
        if (delId) {
            alert('La fonction de suppression est désactivée.');
        }
        const editId = e.target.dataset.edit;
        if (editId) {
            // TODO: ouvrir modal édition si nécessaire
            console.log('Edit product', editId);
        }
    });

});