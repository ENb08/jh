<?php
/**
 * API - Supprimer une dépense
 */

// Désactiver l'affichage des erreurs PHP
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

session_start();

if (!isset($_SESSION['user_id']) && !isset($_SESSION['session_useres'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

try {
    // Vérifier si la table existe
    $table_check = $conn->query("SHOW TABLES LIKE 'mouvements_tresorerie'");
    if (!$table_check || $table_check->num_rows == 0) {
        echo json_encode(['success' => false, 'message' => 'Table mouvements_tresorerie non trouvée']);
        exit;
    }
    
    $id_mouvement = intval($_GET['id'] ?? 0);
    
    if ($id_mouvement <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID invalide']);
        exit;
    }
    
    $sql = "DELETE FROM mouvements_tresorerie WHERE id_mouvement = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $id_mouvement);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Dépense supprimée']);
    } else {
        throw new Exception('Erreur lors de la suppression');
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur: ' . $e->getMessage()]);
}

$conn->close();
