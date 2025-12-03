/**
 * AUTHENTIFICATION - SuperMarket Pro
 * Explication: Gère la connexion utilisateur avec PHP/MySQL
 * - Validation du formulaire
 * - Authentification sécurisée
 * - Gestion des sessions
 * - Messages d'erreur
 */

// ===== UTILITAIRES =====

/**
 * Affiche un message d'état
 * @param {string} message - Le message à afficher
 * @param {string} type - Type de message (success, error, loading)
 * @param {boolean} showSpinner - Afficher un spinner
 */
function showStatus(message, type = 'info', showSpinner = false) {
    const statusEl = document.getElementById('status');
    statusEl.className = `status ${type}`;
    statusEl.innerHTML = showSpinner ? `<div class="spinner"></div>${message}` : message;
    statusEl.hidden = false;
}

/**
 * Masque le message d'état
 */
function hideStatus() {
    const statusEl = document.getElementById('status');
    statusEl.hidden = true;
}

/**
 * Valide le formulaire côté client
 * @returns {boolean} - true si valide
 */
function validateForm() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Réinitialise les erreurs
    document.querySelectorAll('.input.error').forEach(el => el.classList.remove('error'));

    // Validation
    if (!username) {
        document.getElementById('username').classList.add('error');
        showStatus('Veuillez entrer votre identifiant', 'error');
        return false;
    }

    if (!password) {
        document.getElementById('password').classList.add('error');
        showStatus('Veuillez entrer votre mot de passe', 'error');
        return false;
    }

    if (password.length < 6) {
        document.getElementById('password').classList.add('error');
        showStatus('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return false;
    }

    return true;
}

/**
 * Authentifie l'utilisateur
 * @param {string} username - Identifiant ou email
 * @param {string} password - Mot de passe
 * @param {boolean} remember - Se souvenir de l'utilisateur
 */
async function authenticateUser(username, password, remember = false) {
    try {
        // Affiche le statut de chargement
        showStatus('Connexion en cours...', 'loading', true);
        document.getElementById('btnSubmit').disabled = true;

        // Envoie les identifiants au serveur PHP
        const response = await fetch('api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                remember: remember
            })
        });

        // Récupère la réponse
        const result = await response.json();

        // Vérifie le résultat
        if (result.success) {
            // Connexion réussie
            showStatus(`Bienvenue ${result.user.fullname} ! Redirection en cours...`, 'success');

            // Redirige vers le tableau de bord
            setTimeout(() => {
                window.location.href = result.redirect || 'acceuil.html';
            }, 1500);
        } else {
            // Connexion échouée
            showStatus(result.message || 'Identifiant ou mot de passe incorrect', 'error');
            document.getElementById('btnSubmit').disabled = false;

            // Efface le mot de passe
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    } catch (error) {
        console.error('Erreur:', error);
        showStatus('Erreur de connexion au serveur', 'error');
        document.getElementById('btnSubmit').disabled = false;
    }
}

// ===== ÉVÉNEMENTS =====

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const statusDiv = document.getElementById('status');
    const togglePwd = document.getElementById('togglePwd');
    
    // Afficher/masquer le mot de passe
    togglePwd.addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        this.setAttribute('aria-pressed', !isPassword);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Gestion de la soumission du formulaire
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const magasin = document.getElementById('magasin').value;
        
        if (!username || !password || !magasin) {
            showStatus('Veuillez remplir tous les champs', 'error');
            return;
        }

        try {
            const response = await fetch('assets/Api/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    magasin: magasin
                })
            });

            const result = await response.json();

            if (result.success) {
                // Sauvegarder les données hors ligne dans localStorage
                localStorage.setItem('user_session', JSON.stringify(result.offline));
                localStorage.setItem('magasin_id', magasin);
                localStorage.setItem('last_login', new Date().toISOString());
                
                showStatus('Connexion réussie ! Redirection...', 'success');
                setTimeout(() => {
                    window.location.href = 'acceuil.php';
                }, 1500);
            } else {
                showStatus(result.message || 'Erreur de connexion', 'error');
            }
        } catch (error) {
            console.error('Erreur:', error);
            
            // Mode hors ligne : vérifier si l'utilisateur est en cache
            const cachedUser = localStorage.getItem('user_session');
            if (cachedUser) {
                const user = JSON.parse(cachedUser);
                if (user.users_name === username) {
                    showStatus('Mode hors ligne : Connexion avec données en cache', 'warning');
                    setTimeout(() => {
                        window.location.href = 'dashboard.php';
                    }, 1500);
                    return;
                }
            }
            
            showStatus('Erreur de connexion. Vérifiez votre connexion Internet', 'error');
        }
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.hidden = false;
    }

    // Vérifier la session au chargement
    checkSession();
});

// Vérifier si l'utilisateur est déjà connecté
function checkSession() {
    fetch('assets/Api/checkSession.php')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                window.location.href = 'dashboard.php';
            }
        })
        .catch(() => {
            // En cas d'erreur, vérifier le localStorage
            const userSession = localStorage.getItem('user_session');
            if (userSession) {
                console.log('Utilisateur en cache:', JSON.parse(userSession));
            }
        });
}