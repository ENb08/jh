<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$id_produit = isset($data['id_produit']) ? intval($data['id_produit']) : 0;
$quantite = isset($data['quantite']) ? intval($data['quantite']) : 0;
$prix_achat = isset($data['prix_achat']) ? floatval($data['prix_achat']) : 0;
$motif = isset($data['motif']) ? trim($data['motif']) : 'Entrée stock';
$id_users = isset($data['id_users']) ? intval($data['id_users']) : 0;

// Validation
if ($id_produit <= 0 || $quantite <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID produit et quantité requis et > 0']);
    exit;
}

if ($prix_achat < 0) {
    echo json_encode(['success' => false, 'message' => 'Le prix d\'achat ne peut pas être négatif']);
    exit;
}

// Vérifier que le produit existe
$checkSql = "SELECT id_produit, quantite_stock FROM produit WHERE id_produit = ? LIMIT 1";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("i", $id_produit);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Produit introuvable']);
    exit;
}

$product = $checkResult->fetch_assoc();
$stock_actuel = $product['quantite_stock'];

// Insérer l'entrée de stock
$entreesSql = "INSERT INTO entrees_stock (id_produit, quantite, prix_achat, motif, id_users, date_entree)
              VALUES (?, ?, ?, ?, ?, NOW())";
$entreesStmt = $conn->prepare($entreesSql);

if (!$entreesStmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation']);
    exit;
}

$entreesStmt->bind_param("iidii", $id_produit, $quantite, $prix_achat, $motif, $id_users);
$entreesStmt->execute();

if ($entreesStmt->affected_rows > 0) {
    // Mettre à jour le stock du produit
    $newStock = $stock_actuel + $quantite;
    $updateSql = "UPDATE produit SET quantite_stock = ? WHERE id_produit = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("ii", $newStock, $id_produit);
    $updateStmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Entrée de stock enregistrée',
        'data' => [
            'id_produit' => $id_produit,
            'quantite_entree' => $quantite,
            'ancien_stock' => $stock_actuel,
            'nouveau_stock' => $newStock,
            'prix_achat' => $prix_achat,
            'motif' => $motif
        ]
    ]);

    $updateStmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'enregistrement']);
}

$entreesStmt->close();
$checkStmt->close();
$conn->close();
?>
