// Vérifier si l'utilisateur est connecté
function checkSession() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Rediriger vers login si pas connecté
function requireLogin() {
    if (!checkSession()) {
        window.location.href = 'index.html';
    }
}

// Déconnexion
async function logout() {
    try {
        await fetch('assets/Api/logout.php', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
    } finally {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// Obtenir les informations de l'utilisateur
function getUser() {
    return checkSession();
}

// Vérifier la connexion au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    const user = checkSession();

    // Si on est sur la page de login et l'utilisateur est connecté, rediriger
    if (user && window.location.pathname.includes('index.html')) {
        window.location.href = 'acceuil.html';
    }

    // Obtenir les infos de l'utilisateur
    console.log('Connecté en tant que:', user.users_name);
});
