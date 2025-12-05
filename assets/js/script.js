/**
 * AUTHENTIFICATION - SuperMarket Pro
 */

function showStatus(message, type = 'info', showSpinner = false) {
    const statusEl = document.getElementById('status');
    statusEl.className = `status ${type}`;
    statusEl.innerHTML = showSpinner ? `<div class="spinner"></div>${message}` : message;
    statusEl.hidden = false;
}

function hideStatus() {
    const statusEl = document.getElementById('status');
    statusEl.hidden = true;
}

function validateForm() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    document.querySelectorAll('.input-group input.error').forEach(el => el.classList.remove('error'));

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

// Vérifier si l'utilisateur est déjà connecté
function checkSession() {
    const userSession = localStorage.getItem('user_session');
    
    if (userSession) {
        try {
            const user = JSON.parse(userSession);
            console.log('✅ Utilisateur connecté:', user.users_name);
            // Si on est sur la page de login, rediriger vers acceuil
            if (window.location.pathname.includes('index.html')) {
                window.location.href = 'acceuil.html';
            }
        } catch (error) {
            console.error('Erreur parsing session:', error);
            localStorage.removeItem('user_session');
        }
    } else {
        console.log('❌ Pas de session active');
    }
}

// Fonction de déconnexion
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        // Supprimer les données locales
        localStorage.removeItem('user_session');
        localStorage.removeItem('magasin_id');
        localStorage.removeItem('last_login');
        
        // Appeler l'API de logout
        fetch('assets/Api/logout.php', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            console.log('Déconnexion réussie');
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Erreur déconnexion:', error);
            // Forcer la redirection même en cas d'erreur
            window.location.href = 'index.html';
        });
    }
}

// Afficher les informations de l'utilisateur
function displayUserInfo() {
    const userSession = localStorage.getItem('user_session');
    
    if (userSession) {
        try {
            const user = JSON.parse(userSession);
            const userInfoEl = document.getElementById('userInfo');
            
            if (userInfoEl) {
                userInfoEl.innerHTML = `
                    <div class="user-profile">
                        <span class="user-name">${user.users_name}</span>
                        <span class="user-role">${getRoleName(user.role_users)}</span>
                        <button class="btn-logout" onclick="logout()">Déconnexion</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erreur affichage utilisateur:', error);
        }
    }
}

// Obtenir le nom du rôle
function getRoleName(roleId) {
    const roles = {
        '1': 'Admin',
        '2': 'Vendeur',
        '3': 'Caissier',
        '4': 'Gestionnaire'
    };
    return roles[roleId] || 'Utilisateur';
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const statusDiv = document.getElementById('status');
    const togglePwd = document.getElementById('togglePwd');
    
    // Vérifier la session au chargement
    checkSession();
    
    // Afficher les infos utilisateur
    displayUserInfo();
    
    // Charger les magasins au chargement
    loadMagasins();

    // Afficher/masquer le mot de passe
    if (togglePwd) {
        togglePwd.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            this.setAttribute('aria-pressed', !isPassword);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Gestion de la soumission du formulaire
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateForm()) {
                return;
            }

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const magasinSelect = document.getElementById('magasin');
            const magasin = magasinSelect ? magasinSelect.value : '';
            
            if (!magasin) {
                showStatus('Veuillez sélectionner un magasin', 'error');
                return;
            }

            try {
                showStatus('Connexion en cours...', 'loading', true);
                document.querySelector('button[type="submit"]').disabled = true;

                const response = await fetch('assets/Api/login.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                        id_magasin: magasin
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Sauvegarder les données hors ligne
                    localStorage.setItem('user_session', JSON.stringify(result.offline));
                    localStorage.setItem('magasin_id', magasin);
                    localStorage.setItem('last_login', new Date().toISOString());
                    
                    showStatus('✅ Connexion réussie ! Redirection...', 'success');
                    setTimeout(() => {
                        window.location.href = result.redirect || 'acceuil.html';
                    }, 1500);
                } else {
                    showStatus('❌ ' + (result.message || 'Erreur de connexion'), 'error');
                    document.querySelector('button[type="submit"]').disabled = false;
                }
            } catch (error) {
                console.error('Erreur:', error);
                
                // Mode hors ligne
                const cachedUser = localStorage.getItem('user_session');
                if (cachedUser) {
                    try {
                        const user = JSON.parse(cachedUser);
                        if (user.users_name === username) {
                            showStatus('⚠️ Mode hors ligne activé', 'warning');
                            setTimeout(() => {
                                window.location.href = 'acceuil.html';
                            }, 1500);
                            return;
                        }
                    } catch (parseError) {
                        console.error('Erreur parsing cache:', parseError);
                    }
                }
                
                showStatus('❌ Erreur de connexion au serveur', 'error');
                document.querySelector('button[type="submit"]').disabled = false;
            }
        });
    }

    // Charger les magasins
    function loadMagasins() {
        fetch('assets/Api/getMagasins.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.magasins && data.magasins.length > 0) {
                    const magasinSelect = document.getElementById('magasin');
                    if (magasinSelect) {
                        magasinSelect.innerHTML = '<option value="">-- Sélectionner un magasin --</option>';
                        data.magasins.forEach(magasin => {
                            const option = document.createElement('option');
                            option.value = magasin.id_magasin;
                            option.textContent = magasin.nom_magasin;
                            magasinSelect.appendChild(option);
                        });
                    }
                } else {
                    console.warn('Aucun magasin trouvé');
                }
            })
            .catch(error => console.error('Erreur chargement magasins:', error));
    }
});

// Gérer la déconnexion au fermeture de la page
window.addEventListener('beforeunload', function() {
    // Optionnel : notifier le serveur de la déconnexion
    if (localStorage.getItem('user_session')) {
        // Vous pouvez envoyer une notification au serveur ici
    }
});