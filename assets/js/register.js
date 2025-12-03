document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const formMagasin = document.getElementById('formMagasin');
    const formUtilisateur = document.getElementById('formUtilisateur');
    const magasinSelect = document.getElementById('magasinSelect');

    // Gestion des onglets
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });

    // Charger les magasins pour la création d'utilisateur
    loadMagasinsForUser();

    function loadMagasinsForUser() {
        fetch('assets/api/getMagasins.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    magasinSelect.innerHTML = '<option value="">-- Sélectionner --</option>';
                    data.magasins.forEach(magasin => {
                        const option = document.createElement('option');
                        option.value = magasin.id_magasin;
                        option.textContent = magasin.nom_magasin;
                        magasinSelect.appendChild(option);
                    });
                }
            });
    }

    // Créer Magasin
    formMagasin.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('nom_magasin', document.getElementById('nomMagasin').value);
        formData.append('adresse_magasin', document.getElementById('adresseMagasin').value);
        formData.append('telephone_magasin', document.getElementById('telephoneMagasin').value);
        formData.append('email_magasin', document.getElementById('emailMagasin').value);
        formData.append('nom_proprio', document.getElementById('nomProprio').value);
        formData.append('users_name', document.getElementById('usernameMagasin').value);
        formData.append('pasword_user', document.getElementById('passwordMagasin').value);

        fetch('assets/api/createMagasin.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMagasin('Magasin créé avec succès !');
                formMagasin.reset();
                loadMagasinsForUser();
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showErrorMagasin(data.message || 'Erreur lors de la création');
            }
        })
        .catch(error => {
            showErrorMagasin('Erreur de connexi');
            console.error('Erreur:', error);
        });
    });

    // Créer Utilisateur
    formUtilisateur.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('id_magasin', document.getElementById('magasinSelect').value);
        formData.append('users_name', document.getElementById('nomUtilisateur').value);
        formData.append('pasword_user', document.getElementById('passwordUtilisateur').value);
        formData.append('numero_tele', document.getElementById('telephoneUtilisateur').value);
        formData.append('role_users', document.getElementById('roleUtilisateur').value);

        fetch('assets/api/createUser.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessUtilisateur('Utilisateur créé avec succès !');
                formUtilisateur.reset();
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showErrorUtilisateur(data.message || 'Erreur lors de la création');
            }
        })
        .catch(error => {
            showErrorUtilisateur('Erreur de connexion');
            console.error('Erreur:', error);
        });
    });

    function showErrorMagasin(msg) {
        document.getElementById('errorMagasin').textContent = msg;
        document.getElementById('errorMagasin').style.display = 'block';
        document.getElementById('successMagasin').style.display = 'none';
    }
    function showSuccessMagasin(msg) {
        document.getElementById('successMagasin').textContent = msg;
        document.getElementById('successMagasin').style.display = 'block';
        document.getElementById('errorMagasin').style.display = 'none';
    }
    function showErrorUtilisateur(msg) {
        document.getElementById('errorUtilisateur').textContent = msg;
        document.getElementById('errorUtilisateur').style.display = 'block';
        document.getElementById('successUtilisateur').style.display = 'none';
    }
    function showSuccessUtilisateur(msg) {
        document.getElementById('successUtilisateur').textContent = msg;
        document.getElementById('successUtilisateur').style.display = 'block';
        document.getElementById('errorUtilisateur').style.display = 'none';
    }
});