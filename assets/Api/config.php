<?php
/**
 * Configuration pour serveur distant
 * Remplacer les valeurs par celles de votre serveur de production
 */

// Environnement: 'local' ou 'production'
define('ENVIRONMENT', 'local');

// Configuration base de données - LOCAL
define('DB_HOST_LOCAL', 'localhost');
define('DB_USER_LOCAL', 'root');
define('DB_PASS_LOCAL', '');
define('DB_NAME_LOCAL', 'etsjhcom_jh_bd');

// Configuration base de données - PRODUCTION
define('DB_HOST_PROD', 'localhost'); // Modifier avec l'hôte distant
define('DB_USER_PROD', 'votre_user'); // Modifier avec le user distant
define('DB_PASS_PROD', 'votre_password'); // Modifier avec le password distant
define('DB_NAME_PROD', 'votre_database'); // Modifier avec le nom de la BDD distante

// Sélectionner la configuration selon l'environnement
if (ENVIRONMENT === 'production') {
    define('DB_HOST', DB_HOST_PROD);
    define('DB_USER', DB_USER_PROD);
    define('DB_PASS', DB_PASS_PROD);
    define('DB_NAME', DB_NAME_PROD);
} else {
    define('DB_HOST', DB_HOST_LOCAL);
    define('DB_USER', DB_USER_LOCAL);
    define('DB_PASS', DB_PASS_LOCAL);
    define('DB_NAME', DB_NAME_LOCAL);
}

// Configuration CORS pour serveur distant
define('ALLOW_ORIGIN', '*'); // Modifier avec votre domaine en production

// Configuration mode offline
define('OFFLINE_MODE_ENABLED', true);
define('MAX_PENDING_SYNC', 100); // Nombre max de ventes en attente

// Timezone
date_default_timezone_set('Africa/Kinshasa');

// Mode debug (désactiver en production)
define('DEBUG_MODE', ENVIRONMENT === 'local');

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
?>
