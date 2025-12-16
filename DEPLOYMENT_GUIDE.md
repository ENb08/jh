# GUIDE DE DÉPLOIEMENT - MODE OFFLINE/ONLINE

## 📦 Ce qui a été ajouté

### 1. Service Worker (`sw.js`)
- Cache les ressources statiques (HTML, CSS, JS, images)
- Intercepte les requêtes réseau
- Stratégie: Network First, puis Cache
- Background Sync pour synchroniser les données

### 2. Gestionnaire Offline (`offline-manager.js`)
- Gestion de IndexedDB pour stocker les données localement
- Détection automatique de la connexion (online/offline)
- Synchronisation automatique des ventes en attente
- Sauvegarde des produits en cache

### 3. Manifest PWA (`manifest.json`)
- Permet l'installation comme application
- Icônes et configuration PWA

### 4. Modifications dans caisse.html
- Indicateur de connexion en haut à droite (🟢/🔴)
- Badge de synchronisation pour les ventes en attente
- Enregistrement automatique du Service Worker

### 5. Modifications dans pos.js
- Sauvegarde automatique des ventes en mode offline
- Chargement des produits depuis le cache si offline
- Mise à jour du badge de sync

## 🚀 DÉPLOIEMENT SUR SERVEUR DISTANT

### Étape 1: Préparer les fichiers

1. **Modifier `assets/Api/config.php`**:
```php
// Changer l'environnement
define('ENVIRONMENT', 'production');

// Configurer la base de données distante
define('DB_HOST_PROD', 'votre_host_distant');
define('DB_USER_PROD', 'votre_user_distant');
define('DB_PASS_PROD', 'votre_password_distant');
define('DB_NAME_PROD', 'votre_database_distante');

// Configurer CORS
define('ALLOW_ORIGIN', 'https://votre-domaine.com');
```

2. **Modifier `assets/Api/db.php`**:
```php
require_once 'config.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Erreur connexion BD']));
}
```

### Étape 2: Upload sur serveur

1. **Via FTP/SFTP**:
   - Uploader tous les fichiers vers le serveur
   - Garder la structure des dossiers

2. **Via Git** (recommandé):
```bash
git init
git add .
git commit -m "Application avec mode offline"
git remote add origin votre-repo-git
git push -u origin main
```

### Étape 3: Configuration serveur

1. **Apache (.htaccess)**:
```apache
# Activer la compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>

# Cache des ressources
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>

# HTTPS Redirect (si disponible)
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Service Worker MIME type
<IfModule mod_mime.c>
    AddType application/javascript .js
</IfModule>
```

2. **Nginx (nginx.conf)**:
```nginx
location /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Service-Worker-Allowed "/";
}

location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Étape 4: Base de données distante

1. **Créer la base de données**:
   - Importer `assets/Api/etsjhcom_jh_bd.sql`
   - Ou utiliser `create_magasin_tables.sql` + `create_ventes_tables.sql`

2. **Configurer les permissions**:
```sql
GRANT ALL PRIVILEGES ON votre_database.* TO 'votre_user'@'localhost';
FLUSH PRIVILEGES;
```

### Étape 5: Test du mode offline

1. **Tester en local**:
   - Ouvrir caisse.html dans Chrome
   - Ouvrir DevTools > Application > Service Workers
   - Vérifier que le SW est actif
   - Cliquer sur "Offline" pour simuler
   - Faire une vente → elle doit être sauvegardée localement

2. **Tester la synchronisation**:
   - Désactiver "Offline"
   - La vente doit se synchroniser automatiquement
   - Vérifier dans la base de données

## 📱 UTILISATION

### Mode Online
- Toutes les ventes sont envoyées immédiatement au serveur
- Indicateur: 🟢 En ligne

### Mode Offline
- Les ventes sont sauvegardées localement dans IndexedDB
- Badge jaune indique le nombre de ventes en attente
- Indicateur: 🔴 Hors ligne

### Synchronisation automatique
- Dès que la connexion revient, les ventes sont envoyées
- Le badge disparaît une fois tout synchronisé

## 🔧 MAINTENANCE

### Vider le cache
```javascript
// Dans la console du navigateur
caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
});
```

### Voir les données IndexedDB
- Chrome DevTools > Application > IndexedDB > JH_SuperMarket

### Désinstaller le Service Worker
- Chrome DevTools > Application > Service Workers > Unregister

## ⚠️ ATTENTION

1. **HTTPS requis en production** pour Service Worker
2. **Changer ENVIRONMENT** dans config.php avant déploiement
3. **Sécuriser les credentials** de la base de données
4. **Tester sur plusieurs navigateurs**
5. **Faire des backups réguliers** de la base de données

## 🆘 DÉPANNAGE

### Service Worker ne s'installe pas
- Vérifier que le site est en HTTPS
- Vérifier la console pour les erreurs
- Path du SW doit être à la racine

### Sync ne fonctionne pas
- Vérifier IndexedDB dans DevTools
- Vérifier la console pour les erreurs d'API
- Tester manuellement avec `window.syncManager.syncPendingData()`

### Données ne se chargent pas offline
- Vérifier que les produits ont été chargés une fois online
- Vérifier IndexedDB > products

## 📞 SUPPORT

Pour plus d'aide, vérifier:
- Console du navigateur (F12)
- Logs du serveur
- IndexedDB (DevTools > Application)
