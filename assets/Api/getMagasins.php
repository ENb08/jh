<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// Requête pour récupérer tous les magasins
$sql = "SELECT id_magasin, nom_magasin, adresse, numero_magasin FROM magasin ORDER BY nom_magasin ASC";
$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur de requête : ' . $conn->error
    ]);
    exit;
}

$magasins = [];
while ($row = $result->fetch_assoc()) {
    $magasins[] = [
        'id_magasin' => $row['id_magasin'],
        'nom_magasin' => $row['nom_magasin'],
        'adresse' => $row['adresse'],
        'numero_magasin' => $row['numero_magasin']
    ];
}

echo json_encode([
    'success' => true,
    'magasins' => $magasins,
    'total' => count($magasins)
]);

$conn->close();
?>
