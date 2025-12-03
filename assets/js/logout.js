function logout() {
    fetch('assets/Api/logout.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Effacer les données du localStorage
                localStorage.removeItem('user_session');
                localStorage.removeItem('magasin_id');
                localStorage.removeItem('last_login');
                
                // Rediriger vers la page de connexion
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            // Forcer la déconnexion même en cas d'erreur
            localStorage.clear();
            window.location.href = 'index.html';
        });
}