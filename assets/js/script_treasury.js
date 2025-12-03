/**
 * GESTION DE LA TRÉSORERIE - SuperMarket Pro
 * Explication: Gestion complète des finances
 * - Enregistrement des achats fournisseurs
 * - Enregistrement des dépenses
 * - Gestion des factures
 * - Rapports financiers
 * - Graphiques de flux de trésorerie
 */

// ===== DONNÉES GLOBALES =====
let purchases = [];       // Achats fournisseurs
let expenses = [];        // Dépenses opérationnelles
let suppliers = [];       // Liste des fournisseurs
let chartsInstances = {}; // Instances des graphiques

const $ = id => document.getElementById(id);

// ===== UTILITAIRES =====

/**
 * Formate un nombre en devise EUR
 * Explication: Convertit 1234.56 en "1 234,56 €"
 */
const formatMoney = (value) => {
    return value.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
};

/**
 * Formate une date en format français
 * Explication: Convertit "2024-01-15" en "15/01/2024"
 */
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR');
};

/**
 * Calcule la TVA et le montant TTC
 * Explication: Ajoute la TVA au montant HT
 */
function calculateTotalAmount() {
    const ht = parseFloat($('p-amount-ht').value) || 0;
    const vat = parseFloat($('p-vat').value) || 0;
    const ttc = ht * (1 + vat / 100);
    $('p-amount-ttc').value = ttc.toFixed(2);
}

// ===== API CALLS =====

/**
 * Récupère les données depuis l'API PHP
 * @param {string} endpoint - Le fichier PHP à appeler
 * @returns {Promise} - Les données au format JSON
 */
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Erreur fetch:', error);
        alert('Erreur de connexion à la base de données');
        return null;
    }
}

/**
 * Charge les achats depuis la base de données
 * Explication: Récupère tous les achats fournisseurs
 */
async function loadPurchases() {
    const data = await fetchData('purchases_api.php');
    if (data) purchases = data;
    renderPurchases();
    updateStats();
    initCharts();
}

/**
 * Charge les dépenses depuis la base de données
 * Explication: Récupère toutes les dépenses opérationnelles
 */
async function loadExpenses() {
    const data = await fetchData('expenses_api.php');
    if (data) expenses = data;
    renderExpenses();
    updateStats();
    initCharts();
}

/**
 * Charge la liste des fournisseurs
 * Explication: Remplit la liste déroulante des fournisseurs
 */
async function loadSuppliers() {
    const data = await fetchData('suppliers_api.php');
    if (data) {
        suppliers = data;
        updateSupplierSelect();
    }
}

// ===== RENDER FUNCTIONS =====

/**
 * Affiche la liste des achats
 * Explication:
 * - Filtre par fournisseur et statut
 * - Affiche le montant HT, TVA et TTC
 * - Montre le statut de paiement
 */
function renderPurchases(searchText = '', filterSupplier = '', filterStatus = '') {
    const tbody = $('purchasesTable');
    tbody.innerHTML = '';

    purchases.forEach(p => {
        const matchSearch = searchText === '' ||
            (p.supplier_name + ' ' + p.invoice_no).toLowerCase().includes(searchText.toLowerCase());
        const matchSupplier = filterSupplier === '' || filterSupplier === p.supplier_id;
        const matchStatus = filterStatus === '' || filterStatus === p.payment_status;

        if (!matchSearch || !matchSupplier || !matchStatus) return;

        const statusBadge = {
            'pending': '<span class="badge pending">En attente</span>',
            'paid': '<span class="badge ok">Payé</span>',
            'partially': '<span class="badge warning">Partiellement payé</span>'
        }[p.payment_status] || '<span class="badge">Inconnu</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(p.purchase_date)}</td>
            <td>${p.supplier_name}</td>
            <td><span class="badge">${p.category}</span></td>
            <td>${p.invoice_no || '-'}</td>
            <td>${formatMoney(p.amount_ht)}</td>
            <td>${p.vat_percent}%</td>
            <td style="font-weight:600">${formatMoney(p.amount_ttc)}</td>
            <td>${statusBadge}</td>
            <td>
                <i class="fas fa-edit" data-edit-purchase="${p.id}" style="cursor:pointer;margin-right:8px" title="Modifier"></i>
                <i class="fas fa-trash" data-del-purchase="${p.id}" style="cursor:pointer;color:var(--danger)" title="Supprimer"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche la liste des dépenses
 * Explication: Montre les dépenses opérationnelles avec catégories
 */
function renderExpenses(searchText = '', filterCategory = '') {
    const tbody = $('expensesTable');
    tbody.innerHTML = '';

    expenses.forEach(e => {
        const matchSearch = searchText === '' ||
            (e.description + ' ' + e.category).toLowerCase().includes(searchText.toLowerCase());
        const matchCategory = filterCategory === '' || filterCategory === e.category;

        if (!matchSearch || !matchCategory) return;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(e.expense_date)}</td>
            <td><span class="badge">${e.category}</span></td>
            <td>${e.description}</td>
            <td style="font-weight:600">${formatMoney(e.amount)}</td>
            <td>${e.payment_method}</td>
            <td>
                <i class="fas fa-edit" data-edit-expense="${e.id}" style="cursor:pointer;margin-right:8px" title="Modifier"></i>
                <i class="fas fa-trash" data-del-expense="${e.id}" style="cursor:pointer;color:var(--danger)" title="Supprimer"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche les factures à payer
 * Explication: Montre les factures avec échéance et retard éventuel
 */
function renderInvoices() {
    const tbody = $('invoicesTable');
    tbody.innerHTML = '';

    purchases.filter(p => p.payment_status !== 'paid').forEach(p => {
        const dueDate = new Date(p.due_date);
        const today = new Date();
        const isOverdue = dueDate < today;
        const daysOverdue = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(p.purchase_date)}</td>
            <td>${p.supplier_name}</td>
            <td>${p.invoice_no}</td>
            <td style="font-weight:600">${formatMoney(p.amount_ttc)}</td>
            <td>${formatDate(p.due_date)}</td>
            <td>${p.payment_status === 'pending' ? '<span class="badge pending">En attente</span>' : '<span class="badge warning">Partiellement payé</span>'}</td>
            <td>${isOverdue ? `<span class="badge overdue">${daysOverdue} jours</span>` : '<span class="badge ok">À jour</span>'}</td>
            <td>
                <button class="btn" style="padding:6px 10px;font-size:12px" data-mark-paid="${p.id}">Marquer comme payé</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche les transactions récentes
 * Explication: Combine achats et dépenses dans un seul tableau
 */
function renderRecentTransactions() {
    const tbody = $('recentTransactionsTable');
    tbody.innerHTML = '';

    // Combine achats et dépenses
    const transactions = [
        ...purchases.slice(0, 5).map(p => ({
            date: p.purchase_date,
            type: 'Achat',
            description: `${p.supplier_name} - ${p.invoice_no || ''}`,
            amount: -p.amount_ttc,
            status: p.payment_status
        })),
        ...expenses.slice(0, 5).map(e => ({
            date: e.expense_date,
            type: 'Dépense',
            description: `${e.category} - ${e.description}`,
            amount: -e.amount,
            status: 'completed'
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    transactions.forEach(t => {
        const statusBadge = {
            'pending': '<span class="badge pending">En attente</span>',
            'paid': '<span class="badge ok">Payé</span>',
            'partially': '<span class="badge warning">Partiellement</span>',
            'completed': '<span class="badge ok">Complété</span>'
        }[t.status] || '<span class="badge">Inconnu</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td><span class="badge">${t.type}</span></td>
            <td>${t.description}</td>
            <td style="color:var(--danger);font-weight:600">${formatMoney(Math.abs(t.amount))}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Met à jour les statistiques affichées
 * Explication: Calcule et affiche les totaux
 */
function updateStats() {
    const currentMonth = new Date();
    
    // Filtre les transactions du mois actuel
    const monthPurchases = purchases.filter(p => {
        const date = new Date(p.purchase_date);
        return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
    });

    const monthExpenses = expenses.filter(e => {
        const date = new Date(e.expense_date);
        return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
    });

    // Calcule les totaux (on suppose que les revenus viennent de la vente)
    const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0) + 
                          monthPurchases.reduce((sum, p) => sum + p.amount_ttc, 0);

    // Affiche les statistiques
    $('stat-revenue').textContent = formatMoney(5000); // À remplacer par données réelles
    $('stat-expenses').textContent = formatMoney(totalExpenses);
    $('stat-profit').textContent = formatMoney(5000 - totalExpenses);
    $('stat-pending').textContent = purchases.filter(p => p.payment_status === 'pending').length;
}

/**
 * Met à jour la liste déroulante des fournisseurs
 * Explication: Remplit la liste avec les fournisseurs disponibles
 */
function updateSupplierSelect() {
    const sel = $('p-supplier');
    sel.innerHTML = '<option value="">-- Sélectionner --</option>';
    suppliers.forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const filterSel = $('filter-supplier');
    filterSel.innerHTML = '<option value="">Tous les fournisseurs</option>';
    suppliers.forEach(s => {
        filterSel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
}

// ===== CHARTS =====

/**
 * Initialise les graphiques
 * Explication:
 * - Revenu vs Dépenses
 * - Répartition des dépenses par catégorie
 * - Flux de trésorerie sur 30 jours
 */
function initCharts() {
    // Graphique 1: Revenu vs Dépenses
    const ctx1 = $('chartRevenue');
    if (ctx1) {
        if (chartsInstances.revenue) chartsInstances.revenue.destroy();
        
        chartsInstances.revenue = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Revenu', 'Dépenses', 'Bénéfice'],
                datasets: [{
                    label: 'Ce mois',
                    data: [5000, 2500, 2500],
                    backgroundColor: ['#10b981', '#ef4444', '#2563eb']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // Graphique 2: Catégories de dépenses
    const ctx2 = $('chartExpenses');
    if (ctx2) {
        if (chartsInstances.expenses) chartsInstances.expenses.destroy();

        const categories = {};
        expenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });

        chartsInstances.expenses = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Graphique 3: Flux de trésorerie
    const ctx3 = $('chartCashFlow');
    if (ctx3) {
        if (chartsInstances.cashflow) chartsInstances.cashflow.destroy();

        chartsInstances.cashflow = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7'],
                datasets: [{
                    label: 'Entrées',
                    data: [500, 600, 550, 700, 650, 750, 800],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    tension: 0.4
                }, {
                    label: 'Sorties',
                    data: [200, 250, 300, 200, 350, 250, 200],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// ===== SAVE FUNCTIONS =====

/**
 * Enregistre un achat
 * @param {object} purchaseData - Les données de l'achat
 * @returns {boolean} - true si succès
 */
async function savePurchase(purchaseData) {
    if (!purchaseData.supplier_id || !purchaseData.amount_ht) {
        alert('Veuillez remplir les champs obligatoires');
        return false;
    }

    try {
        const response = await fetch('save_purchase.php', {
            method: 'POST',
            body: new FormData(Object.assign(new FormData(), purchaseData))
        });

        const result = await response.json();

        if (result.success) {
            alert('Achat enregistré');
            loadPurchases();
            return true;
        } else {
            alert('Erreur: ' + result.message);
            return false;
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'enregistrement');
        return false;
    }
}

/**
 * Enregistre une dépense
 * @param {object} expenseData - Les données de la dépense
 * @returns {boolean} - true si succès
 */
async function saveExpense(expenseData) {
    if (!expenseData.category || !expenseData.amount) {
        alert('Veuillez remplir les champs obligatoires');
        return false;
    }

    try {
        const response = await fetch('save_expense.php', {
            method: 'POST',
            body: new FormData(Object.assign(new FormData(), expenseData))
        });

        const result = await response.json();

        if (result.success) {
            alert('Dépense enregistrée');
            loadExpenses();
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

/**
 * Supprime un achat
 * @param {number} purchaseId - ID de l'achat
 * @returns {boolean} - true si succès
 */
async function deletePurchase(purchaseId) {
    if (!confirm('Confirmer la suppression ?')) return false;

    try {
        const response = await fetch(`delete_purchase.php?id=${purchaseId}`);
        const result = await response.json();

        if (result.success) {
            alert('Achat supprimé');
            loadPurchases();
            return true;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
    return false;
}

/**
 * Supprime une dépense
 * @param {number} expenseId - ID de la dépense
 * @returns {boolean} - true si succès
 */
async function deleteExpense(expenseId) {
    if (!confirm('Confirmer la suppression ?')) return false;

    try {
        const response = await fetch(`delete_expense.php?id=${expenseId}`);
        const result = await response.json();

        if (result.success) {
            alert('Dépense supprimée');
            loadExpenses();
            return true;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
    return false;
}

// ===== INIT & EVENTS =====

document.addEventListener('DOMContentLoaded', () => {
    $('year').textContent = new Date().getFullYear();

    // Charger les données
    loadPurchases();
    loadExpenses();
    loadSuppliers();

    // ===== GESTION DES ONGLETS =====
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabName = btn.dataset.tab;
            document.querySelectorAll('[role="tabpanel"]').forEach(p => p.style.display = 'none');
            $('tab-' + tabName).style.display = 'block';

            // Actions après ouverture d'un onglet
            if (tabName === 'invoices') {
                renderInvoices();
            } else if (tabName === 'dashboard') {
                renderRecentTransactions();
                initCharts();
            }
        });
    });

    // ===== MODAL MANAGEMENT =====
    function closeModal(id) {
        $(id).classList.remove('show');
    }

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => {
            if (e.target === m) closeModal(m.id);
        });
    });

    // ===== CALCUL TVA =====
    $('p-amount-ht').addEventListener('change', calculateTotalAmount);
    $('p-vat').addEventListener('change', calculateTotalAmount);

    // ===== BOUTONS PRINCIPAUX =====

    $('btn-add-purchase').addEventListener('click', () => {
        document.querySelector('.tab[data-tab="purchases"]').click();
    });

    $('btn-add-expense').addEventListener('click', () => {
        document.querySelector('.tab[data-tab="expenses"]').click();
    });

    // Sauvegarder achat
    $('p-save').addEventListener('click', async () => {
        const purchaseData = {
            supplier_id: $('p-supplier').value,
            category: $('p-category').value,
            invoice_no: $('p-invoice-no').value,
            purchase_date: $('p-date').value,
            amount_ht: parseFloat($('p-amount-ht').value) || 0,
            vat_percent: parseFloat($('p-vat').value) || 0,
            amount_ttc: parseFloat($('p-amount-ttc').value) || 0,
            payment_status: $('p-payment-status').value,
            payment_terms: $('p-terms').value,
            notes: $('p-notes').value
        };

        if (await savePurchase(purchaseData)) {
            $('p-supplier').value = '';
            $('p-category').value = '';
            $('p-invoice-no').value = '';
            $('p-date').value = '';
            $('p-amount-ht').value = '';
            $('p-vat').value = '20';
            $('p-notes').value = '';
            calculateTotalAmount();
        }
    });

    // Sauvegarder dépense
    $('e-save').addEventListener('click', async () => {
        const expenseData = {
            category: $('e-category').value,
            expense_date: $('e-date').value,
            amount: parseFloat($('e-amount').value) || 0,
            payment_method: $('e-payment-method').value,
            description: $('e-description').value
        };

        if (await saveExpense(expenseData)) {
            $('e-category').value = '';
            $('e-date').value = '';
            $('e-amount').value = '';
            $('e-description').value = '';
        }
    });

    // Export
    $('btn-export').addEventListener('click', () => {
        let csv = 'Date;Type;Description;Montant;Statut\n';
        
        purchases.forEach(p => {
            csv += `${formatDate(p.purchase_date)};Achat;${p.supplier_name};${p.amount_ttc};${p.payment_status}\n`;
        });
        
        expenses.forEach(e => {
            csv += `${formatDate(e.expense_date)};Dépense;${e.description};${e.amount};Complété\n`;
        });

        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tresorerie_' + new Date().getTime() + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    // ===== FILTRES =====

    $('search-purchases').addEventListener('input', e => {
        renderPurchases(e.target.value, $('filter-supplier').value, $('filter-purchase-status').value);
    });

    $('filter-supplier').addEventListener('change', e => {
        renderPurchases($('search-purchases').value, e.target.value, $('filter-purchase-status').value);
    });

    $('filter-purchase-status').addEventListener('change', e => {
        renderPurchases($('search-purchases').value, $('filter-supplier').value, e.target.value);
    });

    $('search-expenses').addEventListener('input', e => {
        renderExpenses(e.target.value, $('filter-expense-category').value);
    });

    $('filter-expense-category').addEventListener('change', e => {
        renderExpenses($('search-expenses').value, e.target.value);
    });

    // ===== ACTIONS =====

    document.body.addEventListener('click', async e => {
        if (e.target.dataset.delPurchase) {
            if (await deletePurchase(e.target.dataset.delPurchase)) {
                loadPurchases();
            }
        }

        if (e.target.dataset.delExpense) {
            if (await deleteExpense(e.target.dataset.delExpense)) {
                loadExpenses();
            }
        }

        if (e.target.dataset.markPaid) {
            alert('Marquer comme payé - À implémenter');
        }
    });
});