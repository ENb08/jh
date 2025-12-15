<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// --- GESTION DES ERREURS DE CONNEXION ET DE MÉTHODE ---

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

// --- RÉCUPÉRATION ET VALIDATION DES DONNÉES ---

// Récupérer l'ID session de l'utilisateur connecté
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

// Récupérer les données du formulaire
$type_mouvement = isset($_POST['type_mouvement']) ? trim($_POST['type_mouvement']) : '';
$id_produit = isset($_POST['id_produit']) ? intval($_POST['id_produit']) : 0;
$quantite = isset($_POST['quantite']) ? intval($_POST['quantite']) : 0;
$date_mouvement = isset($_POST['date_mouvement']) ? trim($_POST['date_mouvement']) : date('Y-m-d');
$depot_source = isset($_POST['depot_source']) ? trim($_POST['depot_source']) : '';
$depot_destination = isset($_POST['depot_destination']) ? trim($_POST['depot_destination']) : '';
$reference_mouvement = isset($_POST['reference_mouvement']) ? trim($_POST['reference_mouvement']) : '';
$notes = isset($_POST['notes']) ? trim($_POST['notes']) : '';

// Vérifications
if ($id_session <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

if ($id_produit <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID produit invalide']);
    exit;
}

if ($quantite <= 0) {
    echo json_encode(['success' => false, 'message' => 'La quantité doit être supérieure à 0']);
    exit;
}

// Validation du type de mouvement
$types_valides = ['entree', 'sortie', 'transfert', 'ajustement', 'retour', 'perte'];
if (!in_array($type_mouvement, $types_valides)) {
    echo json_encode(['success' => false, 'message' => 'Type de mouvement invalide']);
    exit;
}

// --- TRAITEMENT BD ---

// 1. Vérifier que le produit existe
$checkProduitSql = "SELECT id_produit, nom_produit, quantite_stock FROM produit WHERE id_produit = ? AND id_session = ? LIMIT 1";
$checkProduitStmt = $conn->prepare($checkProduitSql);

if (!$checkProduitStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation (check produit): ' . $conn->error]);
    exit;
}

$checkProduitStmt->bind_param("ii", $id_produit, $id_session);
$checkProduitStmt->execute();
$checkProduitResult = $checkProduitStmt->get_result();

if ($checkProduitResult->num_rows === 0) {
    $checkProduitStmt->close();
    echo json_encode(['success' => false, 'message' => 'Produit non trouvé']);
    exit;
}

$produit = $checkProduitResult->fetch_assoc();
$nom_produit = $produit['nom_produit'];
$stock_actuel = intval($produit['quantite_stock']);
$checkProduitStmt->close();

// 2. Déterminer l'impact sur le stock selon le type de mouvement
$variation_stock = 0;

switch ($type_mouvement) {
    case 'entree':
    case 'retour':
    case 'ajustement': // Pour ajustement, on peut augmenter
        $variation_stock = $quantite;
        break;
    
    case 'sortie':
    case 'perte':
        // Vérifier qu'on a assez de stock
        if ($stock_actuel < $quantite) {
            echo json_encode([
                'success' => false, 
                'message' => "Stock insuffisant. Stock actuel: $stock_actuel, quantité demandée: $quantite"
            ]);
            exit;
        }
        $variation_stock = -$quantite;
        break;
    
    case 'transfert':
        // Pour un transfert, on ne change pas le stock total
        // (juste le déplacement entre dépôts, mais notre structure simplifie en un seul champ)
        $variation_stock = 0;
        break;
}

// 3. Mettre à jour le stock du produit
if ($variation_stock != 0) {
    $updateSql = "UPDATE produit SET quantite_stock = quantite_stock + ? WHERE id_produit = ? AND id_session = ?";
    $updateStmt = $conn->prepare($updateSql);

    if (!$updateStmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur de préparation (update stock): ' . $conn->error]);
        exit;
    }

    $updateStmt->bind_param("iii", $variation_stock, $id_produit, $id_session);
    $updateStmt->execute();

    if ($updateStmt->affected_rows <= 0 && $variation_stock != 0) {
        $updateStmt->close();
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour du stock']);
        exit;
    }

    $updateStmt->close();
}

// 4. Enregistrer le mouvement dans l'historique (table mouvements_stock)
// Note: Vous devrez créer cette table si elle n'existe pas encore
$mouvementSQL = "INSERT INTO mouvements_stock 
                (id_produit, id_session, type_mouvement, quantite, depot_source, depot_destination, 
                 reference_mouvement, notes, date_mouvement, variation_stock, stock_avant, stock_apres)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$mouvementStmt = $conn->prepare($mouvementSQL);

if ($mouvementStmt) {
    $stock_apres = $stock_actuel + $variation_stock;
    
    // Types: i=int, i=int, s=string, i=int, s=string, s=string, s=string, s=string, s=string, i=int, i=int, i=int
    $mouvementStmt->bind_param(
        "iisisssssiii", 
        $id_produit, 
        $id_session, 
        $type_mouvement, 
        $quantite, 
        $depot_source, 
        $depot_destination, 
        $reference_mouvement, 
        $notes, 
        $date_mouvement,
        $variation_stock,
        $stock_actuel,
        $stock_apres
    );
    
    if (!$mouvementStmt->execute()) {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'enregistrement du mouvement: ' . $mouvementStmt->error]);
        exit;
    }
    
    $mouvementStmt->close();
} else {
    // Si la table n'existe pas encore, on continue quand même (optionnel)
    // echo json_encode(['success' => false, 'message' => 'Erreur de préparation (mouvement): ' . $conn->error]);
    // exit;
}

// 5. Confirmer le succès
try {
    if (method_exists($conn, 'commit')) {
        $conn->commit();
    }
    
    $message = urlencode("✅ Mouvement de stock enregistré avec succès ($type_mouvement: $quantite unités)");
    header("Location: ../../stock.html?status=success&msg=" . $message);
    exit; 

} catch (Exception $e) {
    $message = urlencode("❌ Erreur: " . $e->getMessage());
    header("Location: ../../stock.html?status=error&msg=" . $message);
    exit;
}
?>
