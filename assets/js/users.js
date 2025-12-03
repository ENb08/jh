/**
 * GESTION DES UTILISATEURS - SuperMarket Pro
 * Explication: Ce script gère l'interface de gestion des utilisateurs
 * - Affichage de la liste des utilisateurs
 * - Ajout, modification, suppression d'utilisateurs
 * - Gestion des rôles et permissions
 * - Historique d'activité
 */

// ===== DONNÉES GLOBALES =====
let users = [];           // Liste de tous les utilisateurs
let roles = [];           // Liste des rôles
let activities = [];      // Historique d'activité
let currentUser = null;   // Utilisateur en cours d'édition

const $ = id => document.getElementById(id);

// ===== UTILITAIRES =====

/**
 * Formate une date en format français
 * Explication: Convertit une date ISO en format lisible (ex: 15/01/2024)
 */
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

/**
 * Formate une date avec l'heure
 * Explication: Affiche la date et l'heure complètes
 */
const formatDateTime = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Retourne un badge avec le statut de l'utilisateur
 * Explication: Affiche une couleur différente selon le statut
 */
function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge ok">Actif</span>',
        'inactive': '<span class="badge inactive">Inactif</span>',
        'locked': '<span class="badge danger">Bloqué</span>'
    };
    return badges[status] || '<span class="badge inactive">Inconnu</span>';
}

/**
 * Retourne un badge avec le rôle de l'utilisateur
 * Explication: Affiche une couleur spécifique pour chaque rôle
 */
function getRoleBadge(role) {
    const badges = {
        'admin': '<span class="badge admin">Administrateur</span>',
        'manager': '<span class="badge manager">Gérant</span>',
        'seller': '<span class="badge seller">Caissier</span>',
        'warehouse': '<span class="badge warehouse">Magasinier</span>'
    };
    return badges[role] || '<span class="badge">Unknown</span>';
}

// ===== API CALLS =====

/**
 * Récupère les données depuis l'API PHP
 * @param {string} endpoint - Le fichier PHP à appeler
 * @returns {Promise} - Les données au format JSON
 * 
 * Explication: Envoie une requête HTTP au serveur PHP
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
 * Charge la liste des utilisateurs
 * Explication: Récupère tous les utilisateurs depuis la base de données
 */
async function loadUsers() {
    const data = await fetchData('users_api.php');
    if (data) users = data;
    renderUsers();
    updateStats();
}

/**
 * Charge la liste des rôles
 * Explication: Récupère tous les rôles et leurs permissions
 */
async function loadRoles() {
    const data = await fetchData('roles_api.php');
    if (data) roles = data;
    renderRoles();
}

/**
 * Charge l'historique d'activité
 * Explication: Récupère les logs de connexion et modifications
 */
async function loadActivity() {
    const data = await fetchData('activity_api.php');
    if (data) activities = data;
    renderActivity();
}

// ===== RENDER FUNCTIONS =====

/**
 * Affiche la liste des utilisateurs dans le tableau
 * Explication:
 * - Parcourt tous les utilisateurs
 * - Applique les filtres de recherche
 * - Crée une ligne pour chaque utilisateur
 */
function renderUsers(searchText = '', filterRole = '', filterStatus = '') {
    const tbody = $('usersTable');
    tbody.innerHTML = '';

    users.forEach(user => {
        // Filtre par texte de recherche
        const matchSearch = searchText === '' ||
            (user.fullname + ' ' + user.email + ' ' + user.role)
            .toLowerCase()
            .includes(searchText.toLowerCase());

        // Filtre par rôle
        const matchRole = filterRole === '' || filterRole === user.role;

        // Filtre par statut
        const matchStatus = filterStatus === '' || filterStatus === user.status;

        if (!matchSearch || !matchRole || !matchStatus) return;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.fullname}</strong></td>
            <td>${user.email}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user.status)}</td>
            <td style="text-align:center">
                ${user.is_online ? '<span style="color:var(--accent-2)"><i class="fas fa-circle"></i> En ligne</span>' : '<span style="color:var(--muted)"><i class="fas fa-circle"></i> Hors ligne</span>'}
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <i class="fas fa-edit action-icon" data-edit="${user.id}" title="Modifier"></i>
                ${user.status === 'active' ? 
                    '<i class="fas fa-lock action-icon" data-lock="${user.id}" title="Bloquer"></i>' :
                    '<i class="fas fa-unlock action-icon" data-unlock="${user.id}" title="Débloquer"></i>'
                }
                <i class="fas fa-trash action-icon" data-del="${user.id}" title="Supprimer" style="color:var(--danger)"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche la liste des rôles
 * Explication: Montre chaque rôle, sa description et ses permissions
 */
function renderRoles() {
    const tbody = $('rolesTable');
    tbody.innerHTML = '';

    roles.forEach(role => {
        const userCount = users.filter(u => u.role === role.name).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${role.name}</strong></td>
            <td>${role.description}</td>
            <td style="text-align:center;font-weight:600">${userCount}</td>
            <td><small>${role.permissions.slice(0, 3).join(', ')}...</small></td>
            <td>
                <i class="fas fa-edit action-icon" data-edit-role="${role.id}" title="Modifier"></i>
                <i class="fas fa-trash action-icon" data-del-role="${role.id}" title="Supprimer" style="color:var(--danger)"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Affiche l'historique d'activité
 * Explication: Montre qui a fait quoi et quand
 */
function renderActivity(searchText = '') {
    const tbody = $('activityTable');
    tbody.innerHTML = '';

    activities.slice().reverse().forEach(act => {
        // Filtre par recherche
        if (searchText !== '' && !act.details.toLowerCase().includes(searchText.toLowerCase())) return;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDateTime(act.timestamp)}</td>
            <td><strong>${act.user_name}</strong></td>
            <td><span class="badge">${act.action_type}</span></td>
            <td>${act.details}</td>
            <td><code>${act.ip_address}</code></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Met à jour les statistiques affichées
 * Explication: Calcule et affiche le nombre d'utilisateurs actifs, admins, etc.
 */
function updateStats() {
    $('stat-total').textContent = users.length;
    $('stat-active').textContent = users.filter(u => u.status === 'active').length;
    $('stat-admin').textContent = users.filter(u => u.role === 'admin').length;
    $('stat-online').textContent = users.filter(u => u.is_online).length;
}

// ===== SAVE FUNCTIONS =====

/**
 * Ajoute ou modifie un utilisateur
 * @param {object} userData - Les données de l'utilisateur
 * @returns {boolean} - true si succès, false si erreur
 * 
 * Explication:
 * - Valide les données du formulaire
 * - Envoie les données au serveur
 * - Recharge la liste si succès
 */
async function saveUser(userData) {
    // Validation basique
    if (!userData.fullname || !userData.email || !userData.username || !userData.role) {
        alert('Veuillez remplir tous les champs obligatoires');
        return false;
    }

    const formData = new FormData();
    Object.keys(userData).forEach(key => {
        formData.append(key, userData[key]);
    });

    try {
        const response = await fetch('save_user.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert(userData.id ? 'Utilisateur modifié' : 'Utilisateur ajouté');
            loadUsers();
            loadActivity();
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
 * Supprime un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @returns {boolean} - true si succès
 * 
 * Explication:
 * - Demande confirmation
 * - Envoie la requête DELETE
 * - Recharge la liste
 */
async function deleteUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return false;

    try {
        const response = await fetch(`delete_user.php?id=${userId}`);
        const result = await response.json();

        if (result.success) {
            alert('Utilisateur supprimé');
            loadUsers();
            loadActivity();
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
 * Change le statut d'un utilisateur (bloque/débloque)
 * @param {number} userId - ID de l'utilisateur
 * @param {string} newStatus - Nouveau statut
 * @returns {boolean} - true si succès
 * 
 * Explication: Change le statut sans supprimer l'utilisateur
 */
async function changeUserStatus(userId, newStatus) {
    try {
        const response = await fetch('change_user_status.php', {
            method: 'POST',
            body: new FormData(Object.assign(new FormData(), {
                user_id: userId,
                status: newStatus
            }))
        });

        const result = await response.json();

        if (result.success) {
            alert(`Utilisateur ${newStatus === 'active' ? 'débloqué' : 'bloqué'}`);
            loadUsers();
            loadActivity();
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
 * Crée un nouveau rôle
 * @param {object} roleData - Les données du rôle
 * @returns {boolean} - true si succès
 * 
 * Explication: Ajoute un nouveau rôle avec ses permissions
 */
async function saveRole(roleData) {
    if (!roleData.name) {
        alert('Le nom du rôle est obligatoire');
        return false;
    }

    try {
        const response = await fetch('save_role.php', {
            method: 'POST',
            body: new FormData(Object.assign(new FormData(), roleData))
        });

        const result = await response.json();

        if (result.success) {
            alert('Rôle créé avec succès');
            loadRoles();
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

// ===== INIT & EVENTS =====

document.addEventListener('DOMContentLoaded', () => {
    $('year').textContent = new Date().getFullYear();

    // Charger les données
    loadUsers();
    loadRoles();
    loadActivity();

    // ===== GESTION DES ONGLETS =====
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabName = btn.dataset.tab;
            document.querySelectorAll('[role="tabpanel"]').forEach(p => p.style.display = 'none');
            $('tab-' + tabName).style.display = 'block';
        });
    });

    // ===== MODAL MANAGEMENT =====
    function openModal(id) {
        $(id).classList.add('show');
    }

    function closeModal(id) {
        $(id).classList.remove('show');
        const inputs = $(id).querySelectorAll('input, textarea, select');
        inputs.forEach(inp => inp.value = '');
        currentUser = null;
    }

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => {
            if (e.target === m) closeModal(m.id);
        });
    });

    // ===== BOUTONS PRINCIPAUX =====

    // Ajouter un utilisateur
    $('btn-add-user').addEventListener('click', () => {
        currentUser = null;
        $('modalUserTitle').textContent = 'Ajouter un utilisateur';
        $('u-password').required = true;
        openModal('modalUser');
    });

    // Sauvegarder l'utilisateur
    $('u-save').addEventListener('click', async () => {
        const permissions = Array.from(
            $('modalUser').querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const userData = {
            fullname: $('u-fullname').value,
            email: $('u-email').value,
            username: $('u-username').value,
            password: $('u-password').value,
            role: $('u-role').value,
            phone: $('u-phone').value,
            is_active: $('u-active').checked ? 1 : 0,
            must_change_password: $('u-must-change-pwd').checked ? 1 : 0,
            permissions: JSON.stringify(permissions),
            id: currentUser?.id || null
        };

        if (await saveUser(userData)) {
            closeModal('modalUser');
        }
    });

    // Ajouter un rôle
    $('btn-add-role').addEventListener('click', () => {
        openModal('modalRole');
    });

    // Sauvegarder le rôle
    $('r-save').addEventListener('click', async () => {
        const permissions = Array.from(
            $('modalRole').querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const roleData = {
            name: $('r-name').value,
            description: $('r-description').value,
            permissions: JSON.stringify(permissions)
        };

        if (await saveRole(roleData)) {
            closeModal('modalRole');
        }
    });

    // Export utilisateurs
    $('btn-export').addEventListener('click', () => {
        let csv = 'Nom Complet;Email;Rôle;Statut;Création\n';
        users.forEach(u => {
            csv += `${u.fullname};${u.email};${u.role};${u.status};${formatDate(u.created_at)}\n`;
        });

        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'utilisateurs_' + new Date().getTime() + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    // ===== FILTRES =====

    $('search-users').addEventListener('input', e => {
        renderUsers(e.target.value, $('filter-role').value, $('filter-status').value);
    });

    $('filter-role').addEventListener('change', e => {
        renderUsers($('search-users').value, e.target.value, $('filter-status').value);
    });

    $('filter-status').addEventListener('change', e => {
        renderUsers($('search-users').value, $('filter-role').value, e.target.value);
    });

    $('activity-search').addEventListener('input', e => {
        renderActivity(e.target.value);
    });

    // ===== ACTIONS SUR LES UTILISATEURS =====

    document.body.addEventListener('click', async e => {
        // Modifier un utilisateur
        if (e.target.dataset.edit) {
            const user = users.find(u => u.id == e.target.dataset.edit);
            if (user) {
                currentUser = user;
                $('modalUserTitle').textContent = 'Modifier l\'utilisateur';
                $('u-fullname').value = user.fullname;
                $('u-email').value = user.email;
                $('u-username').value = user.username;
                $('u-role').value = user.role;
                $('u-phone').value = user.phone || '';
                $('u-active').checked = user.is_active;
                $('u-password').required = false;
                $('u-password').value = '';
                openModal('modalUser');
            }
        }

        // Bloquer un utilisateur
        if (e.target.dataset.lock) {
            if (await changeUserStatus(e.target.dataset.lock, 'locked')) {
                loadUsers();
            }
        }

        // Débloquer un utilisateur
        if (e.target.dataset.unlock) {
            if (await changeUserStatus(e.target.dataset.unlock, 'active')) {
                loadUsers();
            }
        }

        // Supprimer un utilisateur
        if (e.target.dataset.del) {
            if (await deleteUser(e.target.dataset.del)) {
                loadUsers();
            }
        }
    });
});