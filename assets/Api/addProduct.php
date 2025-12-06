<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$reference = isset($data['reference']) ? trim($data['reference']) : '';
$nom_produit = isset($data['nom_produit']) ? trim($data['nom_produit']) : '';
$prix_achat = isset($data['prix_achat']) ? floatval($data['prix_achat']) : 0;
$prix_vente = isset($data['prix_vente']) ? floatval($data['prix_vente']) : 0;
$quantite_stock = isset($data['quantite_stock']) ? intval($data['quantite_stock']) : 0;
$categorie = isset($data['categorie']) ? trim($data['categorie']) : 'Général';

// Validation
if (empty($reference) || empty($nom_produit)) {
    echo json_encode(['success' => false, 'message' => 'Référence et nom du produit requis']);
    exit;
}

if ($prix_achat < 0 || $prix_vente < 0 || $quantite_stock < 0) {
    echo json_encode(['success' => false, 'message' => 'Les valeurs ne peuvent pas être négatives']);
    exit;
}

// Vérifier si le produit existe déjà
$checkSql = "SELECT id_produit FROM produit WHERE reference = ? LIMIT 1";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("s", $reference);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Ce produit existe déjà']);
    exit;
}

// Insérer le nouveau produit
$sql = "INSERT INTO produit (reference, nom_produit, prix_achat, prix_vente, quantite_stock, categorie, date_creation)
        VALUES (?, ?, ?, ?, ?, ?, NOW())";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation']);
    exit;
}

$stmt->bind_param("ssddi", $reference, $nom_produit, $prix_achat, $prix_vente, $quantite_stock, $categorie);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    $id_produit = $stmt->insert_id;
    echo json_encode([
        'success' => true,
        'message' => 'Produit ajouté avec succès',
        'product' => [
            'id_produit' => $id_produit,
            'reference' => $reference,
            'nom_produit' => $nom_produit,
            'prix_achat' => $prix_achat,
            'prix_vente' => $prix_vente,
            'quantite_stock' => $quantite_stock,
            'categorie' => $categorie
        ]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'ajout du produit']);
}

$stmt->close();
$checkStmt->close();
$conn->close();
?>
