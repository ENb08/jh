<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Récupérer les paramètres de filtrage
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$categorie = isset($_GET['categorie']) ? trim($_GET['categorie']) : '';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

// Construire la requête
$sql = "SELECT id_produit, reference, nom_produit, prix_achat, prix_vente, quantite_stock, categorie, date_creation
        FROM produit WHERE 1=1";

$params = [];
$types = "";

if (!empty($search)) {
    $sql .= " AND (reference LIKE ? OR nom_produit LIKE ?)";
    $searchTerm = "%$search%";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "ss";
}

if (!empty($categorie)) {
    $sql .= " AND categorie = ?";
    $params[] = $categorie;
    $types .= "s";
}

$sql .= " ORDER BY date_creation DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation']);
    exit;
}

// Bind les paramètres
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$products = [];
while ($row = $result->fetch_assoc()) {
    $products[] = $row;
}

// Récupérer le total
$countSql = "SELECT COUNT(*) as total FROM produit WHERE 1=1";
if (!empty($search)) {
    $countSql .= " AND (reference LIKE ? OR nom_produit LIKE ?)";
}
if (!empty($categorie)) {
    $countSql .= " AND categorie = ?";
}

$countStmt = $conn->prepare($countSql);
if (!empty($params)) {
    $countParams = array_slice($params, 0, -2);
    $countTypes = substr($types, 0, -2);
    if (!empty($countParams)) {
        $countStmt->bind_param($countTypes, ...$countParams);
    }
}
$countStmt->execute();
$countResult = $countStmt->get_result();
$countRow = $countResult->fetch_assoc();
$total = $countRow['total'];

echo json_encode([
    'success' => true,
    'products' => $products,
    'total' => $total,
    'limit' => $limit,
    'offset' => $offset
]);

$stmt->close();
$countStmt->close();
$conn->close();
?>
