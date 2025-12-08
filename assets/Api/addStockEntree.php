<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'db.php';

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur: connexion BD non disponible']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Sécurité Session: id_users est l'ID principal
$id_users = isset($_SESSION['id_users']) ? intval($_SESSION['id_users']) : 0;
// $numero_tele est utilisé comme ID de session pour le tracking dans l'historique
$numero_tele = isset($_SESSION['session_useres']) ? $_SESSION['session_useres'] : '';

if ($id_users <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

// Récupération des données (simplifiée pour post/json)
$data = (strpos(($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== false)
    ? json_decode(file_get_contents("php://input"), true)
    : $_POST;

$id_produit = isset($data['id_produit']) ? intval($data['id_produit']) : 0;
$depot = isset($data['depot']) ? trim($data['depot']) : '';
$quantite = isset($data['quantite']) ? intval($data['quantite']) : 0;
$numero_reference = isset($data['numero_reference']) ? trim($data['numero_reference']) : '';
$notes = isset($data['notes']) ? trim($data['notes']) : '';
$date_entree = isset($data['date_entree']) ? trim($data['date_entree']) : date('Y-m-d');


// --- VALIDATIONS ---
// La vérification $id_produit <= 0 sera résolue si vous corrigez la soumission côté client.
if ($id_produit <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID produit invalide']);
    exit;
}

// ... (Autres validations restantes) ...

// Vérifier les dépôts valides (gardé car nécessaire pour l'historique)
$depots_valides = ['principal', 'reserve', 'vitrine'];
if (!in_array($depot, $depots_valides)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dépôt invalide']);
    exit;
}

$conn->begin_transaction(); // Début de la transaction

try {
    // --- VÉRIFIER QUE LE PRODUIT EXISTE (CORRIGÉ 1) ---
    // La requête est corrigée pour utiliser la clause WHERE et la colonne mono-stock.
    $sql_check = "SELECT `id_produit`, `nom_produit`, `quantite_stock` 
                  FROM `produit` 
                  WHERE `id_produit` = ? 
                  LIMIT 1";
    $stmt_check = $conn->prepare($sql_check);
    
    if (!$stmt_check) throw new Exception('Erreur préparation requête: ' . $conn->error);

    $stmt_check->bind_param("i", $id_produit);
    $stmt_check->execute();
    $result_check = $stmt_check->get_result();

    if ($result_check->num_rows === 0) {
        http_response_code(404);
        throw new Exception('Produit non trouvé');
    }

    $produit = $result_check->fetch_assoc();
    $nom_produit = $produit['nom_produit'];
    // CORRIGÉ 2: Utilisation de la colonne unique 'quantite_stock'
    $stock_actuel = $produit['quantite_stock']; 

    $stmt_check->close();

    // --- METTRE À JOUR LE STOCK (CORRIGÉ 3) ---
    // La requête est corrigée pour mettre à jour UNIQUEMENT la colonne `quantite_stock`.
    $sql_update = "UPDATE `produit` SET `quantite_stock` = `quantite_stock` + ? WHERE `id_produit` = ?";
    $stmt_update = $conn->prepare($sql_update);
    
    if (!$stmt_update) throw new Exception('Erreur préparation update: ' . $conn->error);

    $stmt_update->bind_param("ii", $quantite, $id_produit);

    if (!$stmt_update->execute()) throw new Exception('Erreur exécution update: ' . $stmt_update->error);

    if ($stmt_update->affected_rows <= 0) throw new Exception('Erreur lors de la mise à jour du stock');

    $stmt_update->close();

    // --- ENREGISTRER DANS L'HISTORIQUE (CORRIGÉ 4: SQL et Bind) ---
    // Supposons que la table `entree_stock` contienne: 
    // `id_produit`, `id_users`, `depot`, `quantite`, `numero_reference`, `notes`, `date_entree` (7 colonnes + created_at)
    $sql_entree = "INSERT INTO `entree_stock` 
                   (`id_produit`, `id_users`, `depot`, `quantite`, `numero_reference`, `notes`, `date_entree`, `created_at`) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
    $stmt_entree = $conn->prepare($sql_entree);

    if (!$stmt_entree) throw new Exception('Erreur préparation historique: ' . $conn->error);
    
    // CORRECTION des types et des variables (7 variables, types: i i s i s s s)
    $stmt_entree->bind_param("iisisss", $id_produit, $id_users, $depot, $quantite, $numero_reference, $notes, $date_entree);

    if (!$stmt_entree->execute()) throw new Exception('Erreur enregistrement historique: ' . $stmt_entree->error);

    $stmt_entree->close();

    $conn->commit(); // Validation de la transaction

    // --- RÉPONSE SUCCÈS ---
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Entrée de stock enregistrée avec succès',
        'data' => [
            'id_produit' => $id_produit,
            'nom_produit' => $nom_produit,
            'depot' => $depot,
            'quantite_ajoutee' => $quantite,
            'stock_ancien' => $stock_actuel,
            'stock_nouveau' => $stock_actuel + $quantite,
            'enregistre_par' => $numero_tele,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);

} catch (Exception $e) {
    $conn->rollback(); // Annulation en cas d'erreur
    $message = $e->getMessage();
    
    // Éviter de renvoyer l'erreur de "Produit non trouvé" avec un code 500
    if (strpos($message, 'Produit non trouvé') !== false) {
        // Le code a déjà été défini à 404 dans le try/catch
    } else {
        http_response_code(500); 
    }
    
    echo json_encode(['success' => false, 'message' => $message]);

} finally {
    $conn->close();
}
?>