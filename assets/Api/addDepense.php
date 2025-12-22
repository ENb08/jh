<?php
/**
 * API - Ajouter une dépense
 * Enregistre une nouvelle dépense dans la trésorerie
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

session_start();

// Vérifier la session
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

// Vérifier la méthode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

try {
    // Récupérer les données JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id_magasin = $_SESSION['id_magasin'] ?? 1;
    $user_id = $_SESSION['user_id'];
    $type_mouvement = $input['type'] ?? 'depense';
    $montant = floatval($input['montant'] ?? 0);
    $devise = $input['devise'] ?? 'CDF';
    $description = $input['description'] ?? '';
    $categorie = $input['categorie'] ?? 'autre';
    
    // Validation
    if ($montant <= 0) {
        echo json_encode(['success' => false, 'message' => 'Montant invalide']);
        exit;
    }
    
    // Insérer la dépense
    $sql = "INSERT INTO mouvements_tresorerie 
            (id_magasin, user_id, type_mouvement, montant, devise, description, date_mouvement, categorie) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('iisdsss', $id_magasin, $user_id, $type_mouvement, $montant, $devise, $description, $categorie);
    
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
