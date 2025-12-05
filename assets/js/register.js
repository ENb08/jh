document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const formMagasin = document.getElementById('formMagasin');
    const formUtilisateur = document.getElementById('formUtilisateur');
    const magasinSelect = document.getElementById('magasinSelect');

    // Gestion des onglets
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Charger les magasins pour la création d'utilisateur
    loadMagasinsForUser();

    function loadMagasinsForUser() {
        fetch('assets/Api/getMagasins.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.magasins) {
                    magasinSelect.innerHTML = '<option value="">-- Sélectionner --</option>';
                    data.magasins.forEach(magasin => {
                        const option = document.createElement('option');
                        option.value = magasin.id_magasin;
                        option.textContent = magasin.nom_magasin;
                        magasinSelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                showErrorUtilisateur('Erreur chargement magasins');
            });
    }

    // Créer Magasin
    formMagasin.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('nomMagasin', document.getElementById('nomMagasin').value);
        formData.append('adresseMagasin', document.getElementById('adresseMagasin').value);
        formData.append('telephoneMagasin', document.getElementById('telephoneMagasin').value);
        formData.append('emailMagasin', document.getElementById('emailMagasin').value);
        formData.append('nomProprio', document.getElementById('nomProprio').value);
        formData.append('usernameMagasin', document.getElementById('usernameMagasin').value);
        formData.append('passwordMagasin', document.getElementById('passwordMagasin').value);

        fetch('assets/Api/createMagasin.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMagasin('✅ ' + data.message);
                console.log('Magasin créé:', data.data);
                formMagasin.reset();
                setTimeout(() => {
                    loadMagasinsForUser();
                    // Réinitialiser ou rediriger
                }, 1500);
            } else {
                showErrorMagasin('❌ ' + (data.message || 'Erreur inconnue'));
                if (data.errors) {
                    console.error('Erreurs:', data.errors);
                }
            }
        })
        .catch(error => {
            console.error('Erreur réseau:', error);
            showErrorMagasin('❌ Erreur de connexion au serveur');
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

        fetch('assets/Api/createUser.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessUtilisateur(data.message);
                formUtilisateur.reset();
            } else {
                showErrorUtilisateur(data.message);
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            showErrorUtilisateur('Erreur lors de la création');
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