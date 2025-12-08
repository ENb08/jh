<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
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

// Récupérer l'ID session de l'utilisateur connecté
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

// Récupérer les données du formulaire (form-data)
$id_produit = isset($_POST['id_produit']) ? intval($_POST['id_produit']) : 0;
$depot = isset($_POST['depot']) ? trim($_POST['depot']) : '';  // principal, reserve, vitrine
$quantite = isset($_POST['quantite']) ? intval($_POST['quantite']) : 0;
$numero_reference = isset($_POST['numero_reference']) ? trim($_POST['numero_reference']) : '';
$notes = isset($_POST['notes']) ? trim($_POST['notes']) : '';

// Vérifications
if ($id_session <= 0) {
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

if ($id_produit <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID produit invalide']);
    exit;
}

if (empty($depot)) {
    echo json_encode(['success' => false, 'message' => 'Veuillez sélectionner un dépôt']);
    exit;
}

if ($quantite <= 0) {
    echo json_encode(['success' => false, 'message' => 'La quantité doit être supérieure à 0']);
    exit;
}

// Dépôts valides
$depots_valides = ['principal', 'reserve', 'vitrine'];
if (!in_array($depot, $depots_valides)) {
    echo json_encode(['success' => false, 'message' => 'Dépôt invalide']);
    exit;
}

// Vérifier que le produit existe
$checkProduitSql = "SELECT id_produit, nom_produit FROM produit WHERE id_produit = $id_session LIMIT 1";
$checkProduitStmt = $conn->prepare($checkProduitSql);
$checkProduitStmt->bind_param("i", $id_produit);
$checkProduitStmt->execute();
$checkProduitResult = $checkProduitStmt->get_result();

if ($checkProduitResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Produit non trouvé']);
    exit;
}

$produit = $checkProduitResult->fetch_assoc();
$nom_produit = $produit['nom_produit'];

// Mettre à jour la quantité du produit dans le dépôt spécifié
// Les colonnes de dépôt sont: quantite_principal, quantite_reserve, quantite_vitrine
$colonne_depot = 'quantite_' . $depot;

$updateSql = "UPDATE produit SET $colonne_depot = $colonne_depot + ? WHERE id_produit = ?";
$updateStmt = $conn->prepare($updateSql);

if (!$updateStmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation: ' . $conn->error]);
    exit;
}

$updateStmt->bind_param("ii", $quantite, $id_produit);
$updateStmt->execute();

if ($updateStmt->affected_rows <= 0) {
    echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour du stock']);
    exit;
}

// Enregistrer l'entrée de stock dans l'historique (si table existe)
// INSERT INTO entree_stock (id_produit, id_session, depot, quantite, numero_reference, notes, date_entree)
$entreeSQL = "INSERT INTO entree_stock (id_produit, id_session, depot, quantite, numero_reference, notes, date_entree)
              VALUES (?, ?, ?, ?, ?, ?, NOW())";
$entreeStmt = $conn->prepare($entreeSQL);

if ($entreeStmt) {
    $entreeStmt->bind_param("iisiss", $id_produit, $id_session, $depot, $quantite, $numero_reference, $notes);
    $entreeStmt->execute();
    $entreeStmt->close();
}

// Répondre avec succès
echo json_encode([
    'success' => true,
    'message' => 'Entrée de stock enregistrée avec succès',
    'data' => [
        'id_produit' => $id_produit,
        'nom_produit' => $nom_produit,
        'depot' => $depot,
        'quantite' => $quantite,
        'numero_reference' => $numero_reference,
        'notes' => $notes,
        'date' => date('Y-m-d H:i:s')
    ]
]);

$updateStmt->close();
$checkProduitStmt->close();
$conn->close();
?>
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
