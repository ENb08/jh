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

// Récupérer l'ID session de l'utilisateur connecté
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

if ($id_session <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

// Récupérer les paramètres de recherche
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$filterState = isset($_GET['state']) ? trim($_GET['state']) : '';
$filterDepot = isset($_GET['depot']) ? trim($_GET['depot']) : '';

// Construire la requête SQL de base
$sql = "SELECT
            id_produit as id,
            reference as code,
            nom_produit as name,
            categorie as category,
            prix_achat as buy_price,
            prix_vente as sale_price,
            quantite_stock as depot_principal,
            0 as depot_reserve,
            0 as depot_vitrine,
            quantite_alerte as alert_threshold,
            date_creation
        FROM produit
        WHERE id_session = ?";

$params = [$id_session];
$types = "i";

// Ajouter le filtre de recherche si présent
if (!empty($search)) {
    $sql .= " AND (
        reference LIKE ? OR
        nom_produit LIKE ? OR
        categorie LIKE ?
    )";
    $searchParam = "%{$search}%";
    $params[] = $searchParam;
    $params[] = $searchParam;
    $params[] = $searchParam;
    $types .= "sss";
}

// Ajouter le filtre par état (nécessite un calcul après récupération)
// On récupère d'abord tous les produits puis on filtre côté PHP si nécessaire

$sql .= " ORDER BY nom_produit ASC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation: ' . $conn->error]);
    exit;
}

// Bind des paramètres dynamiquement
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$products = [];

while ($row = $result->fetch_assoc()) {
    $totalStock = intval($row['depot_principal']) + intval($row['depot_reserve']) + intval($row['depot_vitrine']);
    $alertThreshold = intval($row['alert_threshold']);

    // Déterminer l'état du stock
    if ($totalStock == 0) {
        $state = 'critical';
    } elseif ($totalStock <= $alertThreshold) {
        $state = 'low';
    } else {
        $state = 'ok';
    }

    // Appliquer le filtre d'état si présent
    if (!empty($filterState) && $filterState !== $state) {
        continue; // Sauter ce produit s'il ne correspond pas au filtre d'état
    }

    $products[] = [
        'id' => $row['id'],
        'code' => $row['code'],
        'name' => $row['name'],
        'category' => $row['category'],
        'buy_price' => floatval($row['buy_price']),
        'sale_price' => floatval($row['sale_price']),
        'depot_principal' => intval($row['depot_principal']),
        'depot_reserve' => intval($row['depot_reserve']),
        'depot_vitrine' => intval($row['depot_vitrine']),
        'alert_threshold' => $alertThreshold,
        'state' => $state,
        'total_stock' => $totalStock
    ];
}

$stmt->close();
$conn->close();

// Statistiques
$stats = [
    'total' => count($products),
    'low' => count(array_filter($products, fn($p) => $p['state'] === 'low')),
    'critical' => count(array_filter($products, fn($p) => $p['state'] === 'critical')),
    'ok' => count(array_filter($products, fn($p) => $p['state'] === 'ok'))
];

echo json_encode([
    'success' => true,
    'products' => $products,
    'stats' => $stats,
    'filters' => [
        'search' => $search,
        'state' => $filterState,
        'depot' => $filterDepot
    ]
]);
?>
