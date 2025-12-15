<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// Vérifier la connexion
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

// Récupérer les données du formulaire
$id_produit = isset($_POST['id_produit']) ? intval($_POST['id_produit']) : 0;
$quantite = isset($_POST['quantite']) ? intval($_POST['quantite']) : 0;
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

// 1. Vérifier que le produit existe et qu'il y a assez de stock
$checkSql = "SELECT id_produit, nom_produit, quantite_stock FROM produit WHERE id_produit = ? AND id_session = ? LIMIT 1";
$checkStmt = $conn->prepare($checkSql);

if (!$checkStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation: ' . $conn->error]);
    exit;
}

$checkStmt->bind_param("ii", $id_produit, $id_session);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {
    $checkStmt->close();
    echo json_encode(['success' => false, 'message' => 'Produit non trouvé']);
    exit;
}

$produit = $checkResult->fetch_assoc();
$nom_produit = $produit['nom_produit'];
$stock_actuel = intval($produit['quantite_stock']);
$checkStmt->close();

// Vérifier si le stock est suffisant
if ($stock_actuel < $quantite) {
    echo json_encode([
        'success' => false,
        'message' => "Stock insuffisant dans le stock principal. Stock disponible: $stock_actuel, quantité demandée: $quantite"
    ]);
    exit;
}

// 2. Réduire le stock principal
$updateStockSql = "UPDATE produit SET quantite_stock = quantite_stock - ? WHERE id_produit = ? AND id_session = ?";
$updateStockStmt = $conn->prepare($updateStockSql);

if (!$updateStockStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation (update stock): ' . $conn->error]);
    exit;
}

$updateStockStmt->bind_param("iii", $quantite, $id_produit, $id_session);
$updateStockStmt->execute();
$updateStockStmt->close();

// 3. Ajouter au stock du magasin (INSERT ou UPDATE)
$upsertMagasinSql = "INSERT INTO magasin_stock (id_produit, id_session, quantite_magasin, date_derniere_appro)
                     VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE
                     quantite_magasin = quantite_magasin + VALUES(quantite_magasin),
                     date_derniere_appro = NOW()";

$upsertMagasinStmt = $conn->prepare($upsertMagasinSql);

if (!$upsertMagasinStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation (magasin): ' . $conn->error]);
    exit;
}

$upsertMagasinStmt->bind_param("iii", $id_produit, $id_session, $quantite);
$upsertMagasinStmt->execute();
$upsertMagasinStmt->close();

// 4. Enregistrer l'approvisionnement dans l'historique
$approSql = "INSERT INTO appro_magasin (id_produit, id_session, quantite, provenance, notes)
             VALUES (?, ?, ?, 'Stock Principal', ?)";
$approStmt = $conn->prepare($approSql);

if ($approStmt) {
    $approStmt->bind_param("iiis", $id_produit, $id_session, $quantite, $notes);
    $approStmt->execute();
    $approStmt->close();
}

// 5. Confirmer le succès
try {
    if (method_exists($conn, 'commit')) {
        $conn->commit();
    }

    $message = urlencode("✅ Approvisionnement réussi: $quantite unités de $nom_produit transférées au Magasin 1");
    header("Location: ../../stock.html?status=success&msg=" . $message);
    exit;

} catch (Exception $e) {
    $message = urlencode("❌ Erreur: " . $e->getMessage());
    header("Location: ../../stock.html?status=error&msg=" . $message);
    exit;
}
?>
