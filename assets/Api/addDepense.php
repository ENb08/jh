<?php
/**
 * API - Ajouter une dépense
 * Enregistre une nouvelle dépense dans la trésorerie
 */

// Désactiver l'affichage des erreurs PHP
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

session_start();

// Vérifier la session (permettre aussi session_useres pour compatibilité)
if (!isset($_SESSION['user_id']) && !isset($_SESSION['session_useres'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

// Vérifier la méthode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

try {
    // Vérifier si la table existe
    $table_check = $conn->query("SHOW TABLES LIKE 'mouvements_tresorerie'");
    if (!$table_check || $table_check->num_rows == 0) {
        // Créer la table si elle n'existe pas
        $create_sql = "CREATE TABLE IF NOT EXISTS `mouvements_tresorerie` (
            `id_mouvement` INT(15) NOT NULL AUTO_INCREMENT,
            `id_magasin` INT(15) NOT NULL DEFAULT 1,
            `user_id` INT(15) NOT NULL,
            `type_mouvement` VARCHAR(30) NOT NULL,
            `montant` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `devise` VARCHAR(5) NOT NULL DEFAULT 'CDF',
            `description` TEXT DEFAULT NULL,
            `categorie` VARCHAR(50) DEFAULT 'autre',
            `reference` VARCHAR(50) DEFAULT NULL,
            `date_mouvement` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id_mouvement`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $conn->query($create_sql);
    }
    
    // Récupérer les données JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Si pas de JSON, essayer les données POST
    if (!$input) {
        $input = $_POST;
    }
    
    $id_magasin = $_SESSION['id_magasin'] ?? 1;
    $user_id = $_SESSION['user_id'] ?? $_SESSION['session_useres'] ?? 0;
    $type_mouvement = $input['type'] ?? $input['type_mouvement'] ?? 'depense';
    $montant = floatval($input['montant'] ?? 0);
    $devise = $input['devise'] ?? 'CDF';
    $description = $input['description'] ?? '';
    $categorie = $input['categorie'] ?? 'autre';
    $mode_paiement = $input['mode_paiement'] ?? 'cash';
    
    // Validation
    if ($montant <= 0) {
        echo json_encode(['success' => false, 'message' => 'Montant invalide']);
        exit;
    }
    
    // Vérifier si la colonne mode_paiement existe, sinon l'ajouter
    $col_check = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'mode_paiement'");
    if (!$col_check || $col_check->num_rows == 0) {
        $conn->query("ALTER TABLE mouvements_tresorerie ADD COLUMN mode_paiement VARCHAR(20) DEFAULT 'cash'");
    }
    
    // Insérer la dépense
    $sql = "INSERT INTO mouvements_tresorerie 
            (id_magasin, user_id, type_mouvement, montant, devise, description, date_mouvement, categorie, mode_paiement) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('iisdssss', $id_magasin, $user_id, $type_mouvement, $montant, $devise, $description, $categorie, $mode_paiement);
    
    if ($stmt->execute()) {
        $id_mouvement = $conn->insert_id;
        
        echo json_encode([
            'success' => true,
            'message' => 'Dépense enregistrée avec succès',
            'id_mouvement' => $id_mouvement
        ]);
    } else {
        throw new Exception('Erreur lors de l\'enregistrement: ' . $stmt->error);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}

$conn->close();
