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

// Taux de conversion CDF vers USD (récupéré depuis la session)
$TAUX_USD = isset($_SESSION['taux_usd']) ? floatval($_SESSION['taux_usd']) : 2400;

// Requête pour récupérer les produits du magasin 1
// On considère que magasin 1 stocke les produits avec leur quantité
$sql = "SELECT
            p.id_produit,
            p.reference,
            p.nom_produit,
            p.categorie,
            p.prix_achat,
            p.prix_vente,
            p.quantite_stock,
            p.quantite_alerte,
            IFNULL(m.quantite_magasin, 0) as quantite_magasin,
            IFNULL(m.id_magasin_stock, 0) as id_magasin_stock
        FROM produit p
        LEFT JOIN magasin_stock m ON p.id_produit = m.id_produit AND m.id_session = ?
        WHERE p.id_session = ?
        ORDER BY p.nom_produit ASC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation: ' . $conn->error]);
    exit;
}

$stmt->bind_param("ii", $id_session, $id_session);
$stmt->execute();
$result = $stmt->get_result();

$products = [];
$total_items = 0;
$total_value_cdf = 0;
$total_products = 0;

while ($row = $result->fetch_assoc()) {
    $qty_magasin = intval($row['quantite_magasin']);
    $prix_vente = floatval($row['prix_vente']);

    $value_cdf = $qty_magasin * $prix_vente;
    $value_usd = $value_cdf / $TAUX_USD;

    $products[] = [
        'id' => $row['id_produit'],
        'id_magasin_stock' => $row['id_magasin_stock'],
        'code' => $row['reference'],
        'name' => $row['nom_produit'],
        'category' => $row['categorie'],
        'price_cdf' => $prix_vente,
        'price_usd' => round($prix_vente / $TAUX_USD, 2),
        'quantity_stock' => intval($row['quantite_stock']),
        'quantity_magasin' => $qty_magasin,
        'value_cdf' => $value_cdf,
        'value_usd' => round($value_usd, 2)
    ];

    $total_items += $qty_magasin;
    $total_value_cdf += $value_cdf;
    if ($qty_magasin > 0) {
        $total_products++;
    }
}

$stmt->close();
$conn->close();

$response = [
    'products' => $products,
    'summary' => [
        'total_items' => $total_items,
        'total_value_cdf' => $total_value_cdf,
        'total_value_usd' => round($total_value_cdf / $TAUX_USD, 2),
        'total_products' => $total_products,
        'taux_usd' => $TAUX_USD
    ]
];

echo json_encode($response);
?>
