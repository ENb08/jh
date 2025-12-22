<?php
/**
 * API - Supprimer une dépense
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

try {
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
