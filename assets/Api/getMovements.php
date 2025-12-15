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

// Requête pour récupérer les mouvements avec les informations du produit
$sql = "SELECT
            m.id_mouvement,
            m.id_produit,
            m.type_mouvement,
            m.quantite,
            m.depot_source,
            m.depot_destination,
            m.reference_mouvement,
            m.notes,
            m.date_mouvement,
            m.date_creation,
            m.variation_stock,
            m.stock_avant,
            m.stock_apres,
            p.nom_produit,
            p.reference as code_produit
        FROM mouvements_stock m
        LEFT JOIN produit p ON m.id_produit = p.id_produit
        WHERE m.id_session = ?
        ORDER BY m.date_mouvement DESC, m.date_creation DESC
        LIMIT 100";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation: ' . $conn->error]);
    exit;
}

$stmt->bind_param("i", $id_session);
$stmt->execute();
$result = $stmt->get_result();

$movements = [];

while ($row = $result->fetch_assoc()) {
    $movements[] = [
        'id' => $row['id_mouvement'],
        'id_produit' => $row['id_produit'],
        'product_name' => $row['nom_produit'],
        'product_code' => $row['code_produit'],
        'type' => $row['type_mouvement'],
        'quantity' => intval($row['quantite']),
        'depot_from' => $row['depot_source'],
        'depot_to' => $row['depot_destination'],
        'reference' => $row['reference_mouvement'],
        'notes' => $row['notes'],
        'date' => $row['date_mouvement'],
        'created_at' => $row['date_creation'],
        'variation' => intval($row['variation_stock']),
        'stock_before' => intval($row['stock_avant']),
        'stock_after' => intval($row['stock_apres'])
    ];
}

$stmt->close();
$conn->close();

echo json_encode($movements);
?>
