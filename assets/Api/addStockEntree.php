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

// Récupérer les données du formulaire (form-data)
$id_produit = isset($_POST['id_produit']) ? intval($_POST['id_produit']) : 0;
  // principal, reserve, vitrine
$quantite = isset($_POST['quantite']) ? intval($_POST['quantite']) : 0;
$numero_reference = isset($_POST['numero_reference']) ? trim($_POST['numero_reference']) : '';
$notes = isset($_POST['notes']) ? trim($_POST['notes']) : '';

// Vérifications
if ($id_session <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

if ($id_produit <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID produit invalide']);
     echo"$id_produit";
    exit;
}


if ($quantite <= 0) {
    echo json_encode(['success' => false, 'message' => 'La quantité doit être supérieure à 0']);
    exit;
}

// Dépôts valides


// --- TRAITEMENT BD ---

// 1. Vérifier que le produit existe (CORRECTION: utilise $id_produit)
$checkProduitSql = "SELECT id_produit, nom_produit,id_session FROM produit WHERE id_produit =  ? and id_session= $id_session LIMIT 1";
$checkProduitStmt = $conn->prepare($checkProduitSql);

if (!$checkProduitStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation (check produit): ' . $conn->error]);
    exit;
}

$checkProduitStmt->bind_param("i", $id_produit);
$checkProduitStmt->execute();
$checkProduitResult = $checkProduitStmt->get_result();

if ($checkProduitResult->num_rows === 0) {
    $checkProduitStmt->close();
    echo json_encode(['success' => false, 'message' => 'Produit non trouvé']);
    exit;
}

$produit = $checkProduitResult->fetch_assoc();
$nom_produit = $produit['nom_produit'];
$checkProduitStmt->close();


// 2. Mettre à jour la quantité du produit dans le dépôt spécifié
$colonne_depot = 'quantite_stock'; // Colonne dynamique validée par $depots_valides

$updateSql = "UPDATE produit SET $colonne_depot = $colonne_depot + ? WHERE id_produit = ? and id_session= $id_session";
$updateStmt = $conn->prepare($updateSql);

if (!$updateStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation (update stock): ' . $conn->error]);
    exit;
}

$updateStmt->bind_param("ii", $quantite, $id_produit);
$updateStmt->execute();

if ($updateStmt->affected_rows <= 0) {
    $updateStmt->close();
    echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour du stock ou produit non affecté']);
    exit;
}

$updateStmt->close();


// 3. Enregistrer l'entrée de stock dans l'historique
$entreeSQL = "INSERT INTO entree_stock (id_produit, id_session, quantite, numero_reference, notes, date_entree)
              VALUES (?, ?, ?, ?, ?,  NOW())";
$entreeStmt = $conn->prepare($entreeSQL);

if ($entreeStmt) {
    // Types: i=int, i=int, s=string, i=int, s=string, s=string
    $entreeStmt->bind_param("iiiss", $id_produit, $id_session, $quantite, $numero_reference, $notes);
    $entreeStmt->execute();
    $entreeStmt->close();
}


// --- RÉPONSE SUCCÈS ---

echo json_encode([
    'success' => true,
    'message' => 'Entrée de stock enregistrée avec succès',
    'data' => [
        'id_produit' => $id_produit,
        'nom_produit' => $nom_produit,

        'quantite' => $quantite,
        'numero_reference' => $numero_reference,
        'notes' => $notes,
        'date' => date('Y-m-d H:i:s')
    ]
]);

$conn->close();
exit; // ✅ CRITIQUE : Arrête le script pour garantir un JSON propre
?>