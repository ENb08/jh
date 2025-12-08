 // ===== DONNÉES GLOBALES =====
// Ces variables stockent les données récupérées de la base de données
let products = [];      // Liste de tous les produits
let depots = [];        // Liste de tous les dépôts/entrepôts
let movements = [];      // Historique des mouvements de stock
let history = [];       // Historique complet des actions

// ===== UTILITAIRES RACCOURCIS =====
// Fonction pour sélectionner un élément HTML par son ID (plus court que document.getElementById)
const $ = id => document.getElementById(id);

// Fonction pour formater un nombre en format monétaire français (ex: 10.50 €)
const formatMoney = v => v.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';

// ===== APPELS API (REQUÊTES À LA BASE DE DONNÉES) =====
// ⚠️ COMMENTÉ POUR TEST - Utilisez les formulaires PHP directement

/**
 * Récupère les données depuis l'API PHP
 * @param {string} endpoint - Le fichier PHP à appeler (ex: 'products.php')
 * @returns {Promise} - Les données au format JSON
 *
 * Explication: Cette fonction effectue une requête HTTP vers le serveur PHP
 * pour récupérer les données de la base de données MySQL
 */
async function fetchData(endpoint) {
    try {
        // Envoie une requête GET au serveur
        const response = await fetch(`../api/${endpoint}`);

        // Vérifie que la réponse est correcte
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Convertit la réponse JSON en objet JavaScript
        return await response.json();
    } catch (error) {
        // Affiche l'erreur dans la console pour débogage
        console.error('Erreur fetch:', error);

        // Alerte l'utilisateur en cas d'erreur
        alert('Erreur de connexion à la base de données');
        return null;
    }
}

/**
 * Charge tous les produits depuis la base de données
 * Explication:
 * - Appelle l'API pour récupérer les produits
 * - Stocke les données dans la variable 'products'
 * - Réaffiche la liste des produits à l'écran
 * - Met à jour la liste déroulante de sélection des produits
 */
async function loadProducts() {
    const data = await fetchData('products.php');
    if (data) products = data;  // Stocke les données reçues
    renderProducts();           // Rafraîchit l'affichage
    updateProductSelect();      // Met à jour le sélecteur
}

/**
 * Charge tous les dépôts depuis la base de données
 * Explication: Récupère la liste des entrepôts/zones de stockage
 */
async function loadDepots() {
    const data = await fetchData('depots.php');
    if (data) depots = data;
    renderDepots();
}

/**
 * Charge l'historique des mouvements de stock
 * Explication: Récupère les entrées/sorties de produits (achat, vente, transfert)
 */
async function loadMovements() {
    const data = await fetchData('movements.php');
    if (data) movements = data;
    renderMovements();
}

/**
 * Charge l'historique complet des actions
 * Explication: Enregistre toutes les modifications effectuées dans le système
 */
async function loadHistory() {
    const data = await fetchData('history.php');
    if (data) history = data;
    renderHistory();
}

/**
 * Charge et affiche les alertes de stock
 * Explication: Vérifie les produits en rupture ou stock bas
 */
async function loadAlerts() {
    renderAlerts();
}

// ===== FONCTIONS UTILITAIRES DE LOGIQUE =====

/**
 * Détermine l'état du stock d'un produit
 * @param {number} id - L'ID du produit
 * @returns {string} - 'ok', 'low' (bas), 'critical' (rupture) ou 'unknown'
 *
 * Explication:
 * - Calcule le total du stock dans tous les dépôts
 * - Retourne 'critical' si le stock est à 0
 * - Retourne 'low' si le stock est inférieur au seuil d'alerte
 * - Retourne 'ok' si tout va bien
 */
function getProductState(id) {
    const p = products.find(x => x.id === id);  // Cherche le produit par ID
    if (!p) return 'unknown';  // Produit non trouvé

    // Calcule le stock total
    const total = (p.depot_principal || 0) + (p.depot_reserve || 0) + (p.depot_vitrine || 0);

    // Détermine l'état en fonction du total
    return total === 0 ? 'critical' : total <= p.alert_threshold ? 'low' : 'ok';
}

/**
 * Calcule le stock total d'un produit dans tous les dépôts
 * @param {number} id - L'ID du produit
 * @returns {number} - La quantité totale en stock
 *
 * Explication: Additionne les quantités du produit dans chaque dépôt
 */
function getTotalStock(id) {
    const p = products.find(x => x.id === id);
    if (!p) return 0;
    return (p.depot_principal || 0) + (p.depot_reserve || 0) + (p.depot_vitrine || 0);
}

// ===== FONCTIONS D'AFFICHAGE (RENDER) =====

/**
 * Affiche la liste des produits dans le tableau
 * @param {string} searchText - Texte de recherche (par défaut vide)
 * @param {string} filterState - Filtre par état (ok, low, critical)
 * @param {string} filterDepot - Filtre par dépôt
 *
 * Explication:
 * - Parcourt tous les produits
 * - Applique les filtres de recherche et d'état
 * - Crée une ligne de tableau pour chaque produit
 * - Met à jour les statistiques (total, valeur, ruptures, etc.)
 */
function renderProducts(searchText = '', filterState = '', filterDepot = '') {
    const tbody = $('productsTable');  // Trouve le corps du tableau HTML
    tbody.innerHTML = '';  // Vide le tableau

    // Variables pour les statistiques
    let total = 0, value = 0, low = 0, critical = 0;

    // Parcourt chaque produit
    products.forEach(p => {
        // Vérifie si le produit correspond à la recherche
        const matchSearch = searchText === '' ||
            (p.code + ' ' + p.name + ' ' + p.category)
            .toLowerCase()
            .includes(searchText.toLowerCase());

        // Récupère l'état du produit
        const state = getProductState(p.id);

        // Vérifie si le produit correspond au filtre d'état
        const matchState = filterState === '' || filterState === state;

        // Si le produit ne correspond pas aux filtres, passe au suivant
        if (!matchSearch || !matchState) return;

        // Compte le produit et met à jour les statistiques
        total++;
        const totalStock = getTotalStock(p.id);
        value += totalStock * p.buy_price;  // Calcule la valeur en stock
        if (state === 'critical') critical++;
        if (state === 'low') low++;

        // Crée une nouvelle ligne de tableau
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td>${p.name}</td>
            <td><span class="badge info">${p.category}</span></td>
            <td>${formatMoney(p.buy_price)}</td>
            <td>${formatMoney(p.sale_price)}</td>
            <td style="text-align:center;font-weight:600">${p.depot_principal || 0}</td>
            <td style="text-align:center">${p.depot_reserve || 0}</td>
            <td style="text-align:center">${p.depot_vitrine || 0}</td>
            <td>${state === 'ok' ? '<span class="badge ok">En stock</span>' : state === 'low' ? '<span class="badge low">Bas</span>' : '<span class="badge critical">Rupture</span>'}</td>
            <td>
                <i class="fas fa-edit" data-edit="${p.id}" style="cursor:pointer;margin-right:8px" title="Modifier"></i>
                <i class="fas fa-trash" data-del="${p.id}" style="cursor:pointer;color:var(--danger)" title="Supprimer"></i>
            </td>
        `;
        tbody.appendChild(tr);  // Ajoute la ligne au tableau
    });

    // Met à jour les statistiques affichées
    $('stat-total').textContent = products.length;
    $('stat-value').textContent = formatMoney(
        products.reduce((s, p) => s + getTotalStock(p.id) * p.buy_price, 0)
    );
    $('stat-low').textContent = products.filter(p => getProductState(p.id) === 'low').length;
    $('stat-critical').textContent = products.filter(p => getProductState(p.id) === 'critical').length;
}

/**
 * Affiche l'historique des mouvements de stock
 * Explication: Crée un tableau montrant toutes les entrées/sorties/transferts
 */
function renderMovements() {
    const tbody = $('movementsTable');
    tbody.innerHTML = '';

    movements.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(m.created_at).toLocaleString('fr-FR')}</td>
            <td>
                <span class="badge ${m.movement_type === 'IN' ? 'ok' : m.movement_type === 'OUT' ? 'info' : 'low'}">
                    ${m.movement_type === 'IN' ? 'Entrée' : m.movement_type === 'OUT' ? 'Sortie' : 'Transfert'}
                </span>
            </td>
            <td>${m.product_name}</td>
            <td style="font-weight:600">${m.quantity}</td>
            <td>${m.from_depot} → ${m.to_depot}</td>
            <td>${m.reference_number}</td>
            <td>${m.notes}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche la liste des dépôts avec leurs statistiques
 * Explication:
 * - Affiche le nom, localisation et type de chaque dépôt
 * - Calcule le nombre d'articles et la valeur totale par dépôt
 */
function renderDepots() {
    const tbody = $('depotsTable');
    tbody.innerHTML = '';

    depots.forEach(d => {
        // Calcule le nombre d'articles dans ce dépôt
        const articles = products.reduce((sum, p) => {
            if (d.type === 'principal') sum += (p.depot_principal || 0);
            else if (d.type === 'reserve') sum += (p.depot_reserve || 0);
            else if (d.type === 'vitrine') sum += (p.depot_vitrine || 0);
            return sum;
        }, 0);

        // Calcule la valeur totale du dépôt (quantité × prix d'achat)
        const depotValue = products.reduce((sum, p) => {
            let qty = 0;
            if (d.type === 'principal') qty = (p.depot_principal || 0);
            else if (d.type === 'reserve') qty = (p.depot_reserve || 0);
            else if (d.type === 'vitrine') qty = (p.depot_vitrine || 0);
            return sum + qty * p.buy_price;
        }, 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${d.name}</strong></td>
            <td>${d.location}</td>
            <td><span class="badge info">${d.type.charAt(0).toUpperCase() + d.type.slice(1)}</span></td>
            <td>${d.capacity} m³</td>
            <td style="font-weight:600">${articles}</td>
            <td>${formatMoney(depotValue)}</td>
            <td><i class="fas fa-edit" data-edit-depot="${d.id}" style="cursor:pointer" title="Modifier"></i></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche les alertes de stock (ruptures et stocks bas)
 * Explication:
 * - Affiche une alerte CRITIQUE rouge si le produit est en rupture
 * - Affiche une alerte JAUNE si le stock est en-dessous du seuil d'alerte
 * - Affiche un message de succès si tout est normal
 */
function renderAlerts() {
    const container = $('alertsList');
    container.innerHTML = '';

    // Affiche les ruptures complètes
    products.filter(p => getProductState(p.id) === 'critical').forEach(p => {
        const div = document.createElement('div');
        div.className = 'alert danger';  // Alerte rouge
        div.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>${p.name}</strong> — Stock CRITIQUE<br>
                <span class="small-muted">Réf: ${p.code} | Stock total: ${getTotalStock(p.id)}</span>
            </div>
        `;
        container.appendChild(div);
    });

    // Affiche les stocks bas
    products.filter(p => getProductState(p.id) === 'low').forEach(p => {
        const div = document.createElement('div');
        div.className = 'alert warning';  // Alerte orange
        div.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div>
                <strong>${p.name}</strong> — Stock Bas<br>
                <span class="small-muted">Réf: ${p.code} | Stock: ${getTotalStock(p.id)} (seuil: ${p.alert_threshold})</span>
            </div>
        `;
        container.appendChild(div);
    });

    // Si aucune alerte, affiche un message positif
    if (container.innerHTML === '') {
        container.innerHTML = '<div class="alert success"><i class="fas fa-check-circle"></i> Aucune alerte — Stock normal !</div>';
    }
}

/**
 * Affiche l'historique complet de toutes les actions
 * Explication: Enregistre qui a fait quoi et quand
 */
function renderHistory() {
    const tbody = $('historyTable');
    tbody.innerHTML = '';

    // Affiche les actions les plus récentes en premier (slice().reverse())
    history.slice().reverse().forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(h.created_at).toLocaleString('fr-FR')}</td>
            <td><span class="badge info">${h.action_type}</span></td>
            <td>${h.details}</td>
            <td>${h.user_name}</td>
            <td>${h.remarks}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Met à jour la liste déroulante de sélection des produits
 * Explication: Remplit la liste avec tous les produits disponibles
 */
function updateProductSelect() {
    const sel = $('as-product');
    sel.innerHTML = '<option value="">-- Sélectionner --</option>';

    // Ajoute chaque produit à la liste
    products.forEach(p => {
        sel.innerHTML += `<option value="${p.id}">${p.code} - ${p.name}</option>`;
    });
}

// ===== FONCTIONS D'ENREGISTREMENT (SAVE) =====

/**
 * Ajoute un nouveau produit à la base de données
 * @param {string} code - Code-barre ou référence
 * @param {string} name - Nom du produit
 * @param {string} category - Catégorie (Alimentaire, Boisson, etc.)
 * @param {number} buyPrice - Prix d'achat
 * @param {number} salePrice - Prix de vente
 * @param {number} alertThreshold - Seuil d'alerte stock bas
 * @param {number} initial - Stock initial
 * @returns {boolean} - true si succès, false si erreur
 */
async function saveProduct(code, name, category, buyPrice, salePrice, alertThreshold, initial) {
    // ===== VALIDATIONS SÉCURISÉES =====

    // Valider référence (code)
    if (!code || code.trim() === '') {
        alert('❌ Erreur: Veuillez entrer une référence/code');
        return false;
    }
    if (code.length < 2) {
        alert('❌ Erreur: La référence doit contenir au moins 2 caractères');
        return false;
    }
    if (code.length > 50) {
        alert('❌ Erreur: La référence ne doit pas dépasser 50 caractères');
        return false;
    }

    // Valider nom du produit
    if (!name || name.trim() === '') {
        alert('❌ Erreur: Veuillez entrer un nom de produit');
        return false;
    }
    if (name.length < 3) {
        alert('❌ Erreur: Le nom du produit doit contenir au moins 3 caractères');
        return false;
    }
    if (name.length > 100) {
        alert('❌ Erreur: Le nom du produit ne doit pas dépasser 100 caractères');
        return false;
    }

    // Valider catégorie
    if (!category || category.trim() === '') {
        alert('❌ Erreur: Veuillez sélectionner une catégorie');
        return false;
    }

    // Valider prix d'achat
    if (isNaN(buyPrice) || buyPrice === '' || buyPrice === null) {
        alert('❌ Erreur: Veuillez entrer un prix d\'achat valide');
        return false;
    }
    if (parseFloat(buyPrice) < 0) {
        alert('❌ Erreur: Le prix d\'achat ne peut pas être négatif');
        return false;
    }
    if (parseFloat(buyPrice) === 0) {
        alert('❌ Erreur: Le prix d\'achat doit être supérieur à 0');
        return false;
    }
    if (parseFloat(buyPrice) > 999999.99) {
        alert('❌ Erreur: Le prix d\'achat est trop élevé');
        return false;
    }

    // Valider prix de vente
    if (isNaN(salePrice) || salePrice === '' || salePrice === null) {
        alert('❌ Erreur: Veuillez entrer un prix de vente valide');
        return false;
    }
    if (parseFloat(salePrice) < 0) {
        alert('❌ Erreur: Le prix de vente ne peut pas être négatif');
        return false;
    }
    if (parseFloat(salePrice) === 0) {
        alert('❌ Erreur: Le prix de vente doit être supérieur à 0');
        return false;
    }
    if (parseFloat(salePrice) > 999999.99) {
        alert('❌ Erreur: Le prix de vente est trop élevé');
        return false;
    }

    // Valider que le prix de vente >= prix d'achat
    if (parseFloat(salePrice) < parseFloat(buyPrice)) {
        alert('❌ Erreur: Le prix de vente doit être supérieur ou égal au prix d\'achat');
        return false;
    }

    // Valider seuil d'alerte
    if (isNaN(alertThreshold) || alertThreshold === '' || alertThreshold === null) {
        alert('❌ Erreur: Veuillez entrer un seuil d\'alerte valide');
        return false;
    }
    if (parseInt(alertThreshold) < 0) {
        alert('❌ Erreur: Le seuil d\'alerte ne peut pas être négatif');
        return false;
    }
    if (parseInt(alertThreshold) > 99999) {
        alert('❌ Erreur: Le seuil d\'alerte est trop élevé');
        return false;
    }

    // Valider stock initial
    if (isNaN(initial) || initial === '' || initial === null) {
        alert('❌ Erreur: Veuillez entrer un stock initial valide');
        return false;
    }
    if (parseInt(initial) < 0) {
        alert('❌ Erreur: Le stock initial ne peut pas être négatif');
        return false;
    }
    if (parseInt(initial) > 99999) {
        alert('❌ Erreur: Le stock initial est trop élevé');
        return false;
    }

    // Crée un objet FormData pour envoyer les données
    const formData = new FormData();

    // Mappage des variables JS vers les clés POST attendues par addProduct.php
    formData.append('reference', code.trim());             // Code JS -> reference PHP
    formData.append('nom_produit', name.trim());           // Name JS -> nom_produit PHP
    formData.append('categorie', category.trim());         // Category JS -> categorie PHP
    formData.append('Prix_Achat', parseFloat(buyPrice));   // buyPrice JS -> Prix_Achat PHP
    formData.append('Prix_Vente', parseFloat(salePrice));  // salePrice JS -> Prix_Vente PHP
    formData.append('Seuil_Alerte', parseInt(alertThreshold)); // alertThreshold JS -> Seuil_Alerte PHP
    formData.append('Stock_Initial', parseInt(initial));   // initial JS -> Stock_Initial PHP

    try {
        // Envoie les données au serveur en POST
        // Le chemin est corrigé pour correspondre à l'action du formulaire dans stock.html
        console.log('📤 Envoi des données:', {
            reference: code.trim(),
            nom_produit: name.trim(),
            categorie: category.trim(),
            Prix_Achat: parseFloat(buyPrice),
            Prix_Vente: parseFloat(salePrice),
            Seuil_Alerte: parseInt(alertThreshold),
            Stock_Initial: parseInt(initial)
        });

        const response = await fetch('assets/Api/addProduct.php', {
            method: 'POST',
            body: formData
        });

        console.log('📥 Réponse HTTP:', response.status, response.statusText);

        // Récupère la réponse du serveur
        const result = await response.json();

        console.log('📋 Résultat JSON:', result);

        if (result.success) {
            console.log('✅ Produit ajouté avec succès:', result);
            alert('✅ Produit ajouté avec succès');
            // Réinitialiser les champs du formulaire
            $('np-code').value = '';
            $('np-name').value = '';
            $('np-category').value = '';
            $('np-buy').value = '';
            $('np-sale').value = '';
            $('np-alert').value = '10';
            $('np-initial').value = '0';

            // Fermer la modale
            const modalElement = $('modalNewProduct');
            if (modalElement) {
                modalElement.classList.remove('show');
            }

            // Recharger les données
            loadProducts();
            loadHistory();
            loadAlerts();
  console.log('✅ Produit ajouté avec succès:', result);
            alert('✅ Produit ajouté avec succès');
            return true;

        } else {
            alert('❌ Erreur: ' + result.message);
            console.error('Erreur API:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        console.error('Stack:', error.stack);
        alert('❌ Erreur lors de l\'enregistrement: ' + error.message);
        return false;
    }
}

/**
 * Enregistre un mouvement de stock (entrée, sortie, transfert)
 * @param {number} productId - ID du produit
 * @param {string} depot - Dépôt destination (principal, reserve, vitrine)
 * @param {number} qty - Quantité
 * @param {string} ref - Numéro de référence (bon de commande, facture)
 * @param {string} notes - Notes supplémentaires
 * @returns {boolean} - true si succès, false si erreur
 *
 * Explication:
 * - Ajoute une ligne dans la table 'movements'
 * - Met à jour la quantité du produit dans le dépôt
 * - Enregistre l'action dans l'historique
 * - Rafraîchit tous les affichages
 */
async function saveMovement(productId, depot, qty, ref, notes) {
    // ===== VALIDATIONS SÉCURISÉES =====

    if (productId <= 0) {
        alert('❌ Erreur: Veuillez sélectionner un produit');
        return false;
    }

    if (!depot || depot.trim() === '') {
        alert('❌ Erreur: Veuillez sélectionner un dépôt');
        return false;
    }

    if (qty <= 0) {
        alert('❌ Erreur: La quantité doit être supérieure à 0');
        return false;
    }

    if (qty > 99999) {
        alert('❌ Erreur: La quantité est trop élevée');
        return false;
    }

    const formData = new FormData();
    formData.append('id_produit', productId);
    formData.append('depot', depot.trim());
    formData.append('quantite', parseInt(qty));
    formData.append('numero_reference', ref.trim() || 'MANUAL');
    formData.append('notes', notes.trim() || '');

    try {
        console.log('📤 Entrée de stock:', {
            id_produit: productId,
            depot: depot,
            quantite: qty,
            numero_reference: ref,
            notes: notes
        });

        const response = await fetch('assets/Api/addStockEntree.php', {
            method: 'POST',
            body: formData
        });

        console.log('📥 Réponse HTTP:', response.status, response.statusText);

        const result = await response.json();

        console.log('📋 Résultat JSON:', result);

        if (result.success) {
            console.log('✅ Entrée enregistrée:', result);
            alert('✅ Entrée de stock enregistrée avec succès');

            // Réinitialiser les champs du formulaire
            $('as-product').value = '';
            $('as-depot').value = '';
            $('as-qty').value = '';
            $('as-ref').value = '';
            $('as-notes').value = '';

            // Fermer la modale
            const modalElement = $('modalAddStock');
            if (modalElement) {
                modalElement.classList.remove('show');
            }

            // Recharger les données
            loadProducts();
            loadMovements();
            loadAlerts();
            loadHistory();
            return true;
        } else {
            alert('❌ Erreur: ' + result.message);
            console.error('Erreur API:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        console.error('Stack:', error.stack);
        alert('❌ Erreur lors de l\'enregistrement: ' + error.message);
        return false;
    }
}

/**
 * Crée un nouveau dépôt/entrepôt
 * @param {string} name - Nom du dépôt
 * @param {string} type - Type (principal, reserve, vitrine)
 * @param {string} location - Localisation
 * @param {number} capacity - Capacité en m³
 * @param {string} manager - Responsable du dépôt
 * @returns {boolean} - true si succès, false si erreur
 *
 * Explication: Ajoute une nouvelle zone de stockage à la base de données
 */
/*
async function saveDepot(name, type, location, capacity, manager) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('type', type);
    formData.append('location', location);
    formData.append('capacity', capacity);
    formData.append('manager', manager);

    try {
        const response = await fetch('../api/save_depot.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Dépôt créé');
            loadDepots();  // Recharge la liste
            return true;
        } else {
            alert('Erreur: ' + result.message);
            return false;
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création');
        return false;
    }
}
*/

/**
 * Supprime un produit de la base de données
 * @param {number} id - ID du produit à supprimer
 * @returns {boolean} - true si succès, false si erreur
 *
 * Explication:
 * - Demande une confirmation à l'utilisateur
 * - Envoie une requête DELETE au serveur
 * - Recharge la liste des produits
 */
/*
async function deleteProduct(id) {
    // Demande confirmation avant de supprimer
    if (!confirm('Confirmer la suppression ?')) return false;

    try {
        const response = await fetch(`../api/delete_product.php?id=${id}`);
        const result = await response.json();

        if (result.success) {
            alert('Produit supprimé');
            loadProducts();  // Recharge la liste
            return true;
        } else {
            alert('Erreur: ' + result.message);
            return false;
        }
    } catch (error) {
        console.error('Erreur:', error);
        return false;
    }
}
*/

// ===== INITIALISATION ET ÉVÉNEMENTS =====

/**
 * Code exécuté au chargement de la page
 * Explication:
 * - Charge les données depuis la base de données
 * - Configure tous les événements (clics, changements)
 * - Active les onglets et modales
 */
// Dans script_stock.js
function updateProductSelect() {
    const sel = $('as-product');
    sel.innerHTML = '<option value="">-- Sélectionner --</option>';

    // Ajoute chaque produit à la liste 
    products.forEach(p => {
        sel.innerHTML += `<option value="${p.id}">${p.code} - ${p.name}</option>`;
    });
}



document.addEventListener('DOMContentLoaded', () => {
    // Affiche l'année actuelle au pied de page
    $('year').textContent = new Date().getFullYear();

    // ⚠️ COMMENTÉ POUR TEST - Utilisez les formulaires PHP directement
    // Charge toutes les données depuis la base de données
    loadProducts();
    loadDepots();
    loadMovements();
    loadHistory();
    loadAlerts();

    // ===== GESTION DES ONGLETS =====
    // Chaque clic sur un onglet affiche le contenu correspondant
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            // Désactive tous les onglets
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            // Active l'onglet cliqué
            btn.classList.add('active');

            // Récupère le nom de l'onglet
            const tabName = btn.dataset.tab;

            // Masque tous les contenu des onglets
            document.querySelectorAll('[role="tabpanel"]').forEach(p => p.style.display = 'none');
            // Affiche le contenu de l'onglet sélectionné
            $('tab-' + tabName).style.display = 'block';

            // Recharge l'historique si c'est l'onglet historique
            if (tabName === 'history') loadHistory();
        });
    });

    // ===== GESTION DES MODALES (FENÊTRES POP-UP) =====

    /**
     * Ouvre une modale en ajoutant la classe 'show'
     * @param {string} id - ID de la modale
     */
    function openModal(id) {
        $(id).classList.add('show');
    }

    /**
     * Ferme une modale en supprimant la classe 'show'
     * @param {string} id - ID de la modale
     * Explication: Réinitialise aussi tous les champs du formulaire
     */
    function closeModal(id) {
        $(id).classList.remove('show');
        // Vide tous les champs du formulaire
        const inputs = $(id).querySelectorAll('input, textarea, select');
        inputs.forEach(inp => inp.value = '');
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

    // Bouton: Sauvegarder le nouveau produit
    $('np-save').addEventListener('click', async () => {
        const code = $('np-code').value.trim();
        const name = $('np-name').value.trim();
        const category = $('np-category').value;
        const buy = parseFloat($('np-buy').value) || 0;
        const sale = parseFloat($('np-sale').value) || 0;
        const alert = parseInt($('np-alert').value) || 10;
        const initial = parseInt($('np-initial').value) || 0;

        // Vérifie que les champs obligatoires sont remplis
        if (!code || !name) return alert('Remplissez au moins code et désignation');

        // Enregistre le produit et ferme la modale si succès
        if (await saveProduct(code, name, category, buy, sale, alert, initial)) {
            closeModal('modalNewProduct');
        }
    });

    // Bouton: Ajouter du stock (entrée)
    $('btn-add-stock').addEventListener('click', () => openModal('modalAddStock'));

    // Bouton: Sauvegarder l'entrée de stock
    $('as-save').addEventListener('click', async () => {
        const productId = $('as-product').value;
        const depot = $('as-depot').value;
        const qty = parseInt($('as-qty').value) || 0;
        const ref = $('as-ref').value || 'MANUAL';
        const notes = $('as-notes').value;

        // Vérifie que les données sont valides
        if (!productId || qty <= 0) return alert('Sélectionnez un produit et quantité > 0');

        // Enregistre le mouvement et ferme la modale si succès
        if (await saveMovement(productId, depot, qty, ref, notes)) {
            closeModal('modalAddStock');
        }
    });

    // Bouton: Lancer un inventaire
    // Explication: Réinitialise tous les stocks à 0 pour recompter physiquement
    $('btn-inventory').addEventListener('click', async () => {
        if (!confirm('Lancer inventaire ? (Tous les stocks seront réinitialisés)')) return;

        try {
            const response = await fetch('../api/start_inventory.php', {method: 'POST'});
            const result = await response.json();

            if (result.success) {
                alert('Inventaire lancé');
                loadProducts();
                loadHistory();
            } else {
                alert('Erreur: ' + result.message);
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    });

    // Bouton: Créer un nouveau dépôt
    $('btn-new-depot').addEventListener('click', () => openModal('modalNewDepot'));

    // Bouton: Sauvegarder le nouveau dépôt
    $('nd-save').addEventListener('click', async () => {
        const name = $('nd-name').value.trim();
        const type = $('nd-type').value;
        const location = $('nd-location').value.trim();
        const capacity = parseFloat($('nd-capacity').value) || 0;
        const manager = $('nd-manager').value.trim();

        // Vérifie que les données obligatoires sont remplies
        if (!name || !location) return alert('Remplissez au moins nom et localisation');

        // Crée le dépôt et ferme la modale si succès
        if (await saveDepot(name, type, location, capacity, manager)) {
            closeModal('modalNewDepot');
        }
    });

    // Bouton: Exporter les données en CSV (Excel)
    $('btn-export').addEventListener('click', () => {
        // Crée un texte au format CSV (colonnes séparées par ;)
        let csv = 'Code;Produit;Catégorie;Prix A;Prix V;Principal;Reserve;Vitrine;Total;État\n';

        // Ajoute chaque produit dans le CSV
        products.forEach(p => {
            const total = getTotalStock(p.id);
            const state = getProductState(p.id);
            csv += `${p.code};${p.name};${p.category};${p.buy_price};${p.sale_price};${p.depot_principal};${p.depot_reserve};${p.depot_vitrine};${total};${state}\n`;
        });

        // Télécharge le fichier
        const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stock_' + new Date().getTime() + '.csv';  // Nom avec timestamp
        a.click();
        URL.revokeObjectURL(url);
    });

    // ===== ÉVÉNEMENTS DE RECHERCHE ET FILTRES =====

    // Recherche en temps réel
    $('search').addEventListener('input', e => {
        renderProducts(e.target.value, $('filter-state').value, $('filter-depot').value);
    });

    // Filtre par état (ok, low, critical)
    $('filter-state').addEventListener('change', e => {
        renderProducts($('search').value, e.target.value, $('filter-depot').value);
    });

    // ===== ÉVÉNEMENTS DÉLÉGUÉS DU TABLEAU =====
    // Utilise la délégation pour capturer les clics sur les icônes d'actions
    document.body.addEventListener('click', async e => {
        // Supprime un produit
        if (e.target.dataset.del) {
            if (await deleteProduct(e.target.dataset.del)) {
                loadProducts();
            }
        }
    });
});
