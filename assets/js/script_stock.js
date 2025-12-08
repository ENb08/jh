// ===== DONNÉES GLOBALES (Minimum requis pour l'ajout de produit et l'affichage) =====
let products = [];      // Liste de tous les produits
let depots = [];        // Laissé pour éviter les erreurs, mais non utilisé
let movements = [];      // Laissé pour éviter les erreurs, mais non utilisé
let history = [];       // Laissé pour éviter les erreurs, mais non utilisé

// ===== UTILITAIRES RACCOURCIS =====
const $ = id => document.getElementById(id);

// Fonction pour formater un nombre en format monétaire français (ex: 10.50 €)
const formatMoney = v => parseFloat(v).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';

// ===== APPELS API (REQUÊTES À LA BASE DE DONNÉES) =====

/**
 * Récupère les données depuis l'API PHP
 */
async function fetchData(endpoint) {
    try {
        const response = await fetch(`assets/Api/${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Erreur fetch:', error);
        alert('Erreur de connexion à la base de données');
        return null;
    }
}

/**
 * Charge tous les produits depuis la base de données et rafraîchit l'interface
 */
async function loadProducts() {
    const data = await fetchData('../api/produit.php');
    if (data) products = data;  // Stocke les données reçues
    renderProducts();           // Rafraîchit l'affichage du tableau
    updateProductSelect();      // RESTITUÉ : Met à jour la liste déroulante d'ajout de stock
}

// Fonctions laissées pour la compatibilité avec loadProducts, mais sans corps
async function loadDepots() {}
async function loadMovements() {}
async function loadHistory() {}
async function loadAlerts() {}

// ===== FONCTIONS UTILITAIRES DE LOGIQUE (Nécessaires pour renderProducts) =====

/**
 * Détermine l'état du stock d'un produit
 */
function getProductState(id) {
    const p = products.find(x => x.id == id);
    if (!p) return 'unknown';

    const total = (p.depot_principal || 0) + (p.depot_reserve || 0) + (p.depot_vitrine || 0);

    return total == 0 ? 'critical' : total <= p.alert_threshold ? 'low' : 'ok';
}

/**
 * Calcule le stock total d'un produit dans tous les dépôts
 */
function getTotalStock(id) {
    const p = products.find(x => x.id == id);
    if (!p) return 0;
    // Les valeurs des dépôts sont stockées comme chaînes dans le JSON, on doit les convertir en nombre
    return parseInt(p.depot_principal || 0) + parseInt(p.depot_reserve || 0) + parseInt(p.depot_vitrine || 0);
}

// ===== FONCTIONS D'AFFICHAGE (RENDER) =====

/**
 * Met à jour la liste déroulante de sélection des produits dans la modale d'ajout de stock
 * (RESTITUÉ)
 */
function updateProductSelect() {
    const select = $('as-product-id');
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
 * (RESTITUÉ)
 */
function renderAddStockInfo(productId) {
    const infoPanel = $('as-product-info');
    const p = products.find(x => x.id == productId);

    if (p) {
        infoPanel.style.display = 'block';
        $('as-current-stock').textContent = getTotalStock(p.id);
        $('as-current-buy-price').textContent = formatMoney(p.buy_price);
        $('as-current-sale-price').textContent = formatMoney(p.sale_price);
        $('as-new-buy-price').value = parseFloat(p.buy_price).toFixed(2); // Pré-remplir le prix d'achat
        $('as-new-sale-price').placeholder = `0.00 (actuel: ${formatMoney(p.sale_price)})`; // Indiquer le prix de vente actuel
    } else {
        infoPanel.style.display = 'none';
        $('as-new-buy-price').value = '';
        $('as-new-sale-price').value = '';
    }
}

/**
 * Affiche la liste des produits dans le tableau
 */
function renderProducts(searchText = '', filterState = '', filterDepot = '') {
    const tbody = $('productsTable');
    tbody.innerHTML = '';

    let total = 0, value = 0, low = 0, critical = 0;

    products.forEach(p => {
        const matchSearch = searchText === '' ||
            (p.code + ' ' + p.name + ' ' + p.category)
            .toLowerCase()
            .includes(searchText.toLowerCase());

        const state = getProductState(p.id);
        const matchState = filterState === '' || filterState === state;

        if (!matchSearch || !matchState) return;

        total++;
        const totalStock = getTotalStock(p.id);
        // Assurez-vous que buy_price est traité comme un nombre
        value += totalStock * parseFloat(p.buy_price || 0);
        if (state === 'critical') critical++;
        if (state === 'low') low++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td>${p.name}</td>
            <td><span class="badge info">${p.category}</span></td>
            <td>${formatMoney(p.buy_price)}</td>
            <td>${formatMoney(p.sale_price)}</td>
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

    // Met à jour les statistiques affichées
    $('stat-total').textContent = products.length;
    $('stat-value').textContent = formatMoney(
        products.reduce((s, p) => s + getTotalStock(p.id) * parseFloat(p.buy_price || 0), 0)
    );
    $('stat-low').textContent = products.filter(p => getProductState(p.id) === 'low').length;
    $('stat-critical').textContent = products.filter(p => getProductState(p.id) === 'critical').length;
}

// ===== FONCTIONS D'ENREGISTREMENT (SAVE) =====

/**
 * Ajoute un nouveau produit à la base de données (CONSERVÉ)
 */
async function saveProduct(code, name, category, buyPrice, salePrice, alertThreshold, initial) {
    // ... (Logique de validation et d'enregistrement de saveProduct) ...
    if (!code || code.trim() === '') {
        alert('❌ Erreur: Veuillez entrer une référence/code');
        return false;
    }
    if (code.length < 2 || code.length > 50) {
        alert('❌ Erreur: La référence doit contenir entre 2 et 50 caractères');
        return false;
    }
    if (!name || name.trim() === '') {
        alert('❌ Erreur: Veuillez entrer un nom de produit');
        return false;
    }
    if (name.length < 3 || name.length > 100) {
        alert('❌ Erreur: Le nom du produit doit contenir entre 3 et 100 caractères');
        return false;
    }
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

    // Crée un objet FormData pour envoyer les données
    const formData = new FormData();
    formData.append('reference', code.trim());
    formData.append('nom_produit', name.trim());
    formData.append('categorie', category.trim());
    formData.append('Prix_Achat', bP);
    formData.append('Prix_Vente', sP);
    formData.append('Seuil_Alerte', aT);
    formData.append('Stock_Initial', init);

    try {
        const response = await fetch('assets/Api/addProduct.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Produit ajouté avec succès');
            // Réinitialiser les champs du formulaire (simplifié)
            $('np-code').value = '';
            $('np-name').value = '';
            $('np-category').value = '';
            $('np-buy').value = '';
            $('np-sale').value = '';
            $('np-alert').value = '5';
            $('np-initial').value = '0';

            // Fermer la modale
            $('modalNewProduct').classList.remove('show');

            // Recharger les données
            loadProducts();
            return true;

        } else {
            alert('❌ Erreur: ' + result.message);
            console.error('Erreur API:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        alert('❌ Erreur lors de l\'enregistrement: ' + error.message);
        return false;
    }
}


/**
 * Enregistre une entrée de stock (Ajout de Stock)
 * (RESTITUÉ)
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
        const response = await fetch('assets/Api/addStockEntree.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Entrée de ${q} unités enregistrée avec succès.`);
            
            // Réinitialisation et fermeture
            $('as-product-id').value = '';
            $('as-quantity').value = '1';
            $('as-new-buy-price').value = '';
            $('as-new-sale-price').value = '';
            $('as-note').value = '';
            $('modalAddStock').classList.remove('show');
            
            // Masquer le panneau d'info
            $('as-product-info').style.display = 'none';

            // Recharger les données pour mettre à jour le catalogue
            loadProducts();
            // loadMovements(); // Retiré
            // loadHistory(); // Retiré
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


// Les autres fonctions d'enregistrement (saveDepot, deleteProduct) ont été retirées

// ===== INITIALISATION ET ÉVÉNEMENTS =====

document.addEventListener('DOMContentLoaded', () => {
    // Affiche l'année actuelle au pied de page
    $('year').textContent = new Date().getFullYear();

    // Charge les produits et dépôts pour l'affichage initial du catalogue
    loadProducts();
    // loadDepots(); // Les appels des autres fonctions de load ont été retirés

    // ===== GESTION DES ONGLETS (Simplifié) =====
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabName = btn.dataset.tab;

            document.querySelectorAll('[role="tabpanel"]').forEach(p => p.style.display = 'none');
            $('tab-' + tabName).style.display = 'block';
        });
    });

    // ===== GESTION DES MODALES (FENÊTRES POP-UP) =====

    /**
     * Ouvre une modale
     */
    function openModal(id) {
        $(id).classList.add('show');
    }

    /**
     * Ferme une modale
     */
    function closeModal(id) {
        $(id).classList.remove('show');
        // Vide tous les champs du formulaire (essentiel pour la réinitialisation)
        const form = $(id).querySelector('form');
        if (form) form.reset();

        // Réinitialisation spécifique pour l'ajout de stock
        if (id === 'modalAddStock') {
             $('as-product-id').value = '';
             $('as-product-info').style.display = 'none';
        }
    }

    // Boutons de fermeture des modales
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // Ferme la modale en cliquant en dehors
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => {
            if (e.target === m) closeModal(m.id);
        });
    });

    // ===== ÉVÉNEMENTS DES BOUTONS =====

    // Bouton: Ajouter un produit
    $('btn-new-product').addEventListener('click', () => openModal('modalNewProduct'));

    // Bouton: Enregistre le nouveau produit
    $('np-save').addEventListener('click', async (e) => {
        e.preventDefault();
        const code = $('np-code').value.trim();
        const name = $('np-name').value.trim();
        const category = $('np-category').value;
        const buy = $('np-buy').value;
        const sale = $('np-sale').value;
        const alert = $('np-alert').value;
        const initial = $('np-initial').value;
        await saveProduct(code, name, category, buy, sale, alert, initial);
    });

    // Bouton: Entrée Stock (RESTITUÉ)
    $('btn-add-stock').addEventListener('click', () => {
        openModal('modalAddStock');
        renderAddStockInfo($('as-product-id').value); // Pour initialiser/vider les infos
    });

    // Changement de produit dans la modale d'ajout de stock (RESTITUÉ)
    $('as-product-id').addEventListener('change', e => {
        renderAddStockInfo(e.target.value);
    });

    // Bouton: Enregistrer l'entrée de stock (RESTITUÉ)
    $('as-save').addEventListener('click', async (e) => {
        e.preventDefault();
        const productId = $('as-product-id').value;
        const quantity = $('as-quantity').value;
        const depot = $('as-depot').value;
        const newBuyPrice = $('as-new-buy-price').value;
        const newSalePrice = $('as-new-sale-price').value;
        const note = $('as-note').value;

        await saveMovement(productId, quantity, depot, newBuyPrice, newSalePrice, note);
    });

    // ===== ÉVÉNEMENTS DE RECHERCHE ET FILTRES (Conservés pour l'affichage du catalogue) =====

    // Recherche en temps réel
    $('search').addEventListener('input', e => {
        renderProducts(e.target.value, $('filter-state').value, $('filter-depot').value);
    });

    // Filtre par état (ok, low, critical)
    $('filter-state').addEventListener('change', e => {
        renderProducts($('search').value, e.target.value, $('filter-depot').value);
    });

    // Filtre par dépôt
    $('filter-depot').addEventListener('change', e => {
        renderProducts($('search').value, $('filter-state').value, e.target.value);
    });

    // ===== ÉVÉNEMENTS DÉLÉGUÉS DU TABLEAU (Simplifié) =====
    document.body.addEventListener('click', async e => {
        // Supprime un produit (la fonction deleteProduct est commentée, donc cela ne fait rien pour l'instant)
        if (e.target.dataset.del) {
            alert('La fonction de suppression est désactivée.');
        }
    });
});