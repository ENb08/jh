<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Récupérer les paramètres
$id_produit = isset($_GET['id_produit']) ? intval($_GET['id_produit']) : 0;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

$sql = "SELECT es.id_entree, es.id_produit, es.quantite, es.prix_achat, es.motif, es.date_entree,
               p.nom_produit, p.reference, u.users_name
        FROM entrees_stock es
        JOIN produit p ON es.id_produit = p.id_produit
        LEFT JOIN users_jh u ON es.id_users = u.id_users
        WHERE 1=1";

$params = [];
$types = "";

if ($id_produit > 0) {
    $sql .= " AND es.id_produit = ?";
    $params[] = $id_produit;
    $types .= "i";
}

$sql .= " ORDER BY es.date_entree DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation']);
    exit;
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$entrees = [];
while ($row = $result->fetch_assoc()) {
    $entrees[] = $row;
}

// Récupérer le total
$countSql = "SELECT COUNT(*) as total FROM entrees_stock WHERE 1=1";
if ($id_produit > 0) {
    $countSql .= " AND id_produit = ?";
}

$countStmt = $conn->prepare($countSql);
if ($id_produit > 0) {
    $countStmt->bind_param("i", $id_produit);
}
$countStmt->execute();
$countResult = $countStmt->get_result();
$countRow = $countResult->fetch_assoc();
$total = $countRow['total'];

echo json_encode([
    'success' => true,
    'entrees' => $entrees,
    'total' => $total,
    'limit' => $limit,
    'offset' => $offset
]);

$stmt->close();
$countStmt->close();
$conn->close();
?>
