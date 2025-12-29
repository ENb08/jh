<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'assets/Api/db.php';

echo "=== Vérification table stock_entrees ===\n\n";

// Vérifier les colonnes
echo "Colonnes de la table:\n";
$result = $conn->query('SHOW COLUMNS FROM stock_entrees');
if ($result) {
    while($row = $result->fetch_assoc()) {
        echo "  - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} else {
    echo "Table non trouvée\n";
}

echo "\n=== Données existantes ===\n";
$data = $conn->query('SELECT * FROM stock_entrees ORDER BY id_entree DESC LIMIT 5');
if ($data && $data->num_rows > 0) {
    while($row = $data->fetch_assoc()) {
        echo "\nID: " . $row['id_entree'] . "\n";
        echo "  Fournisseur: " . ($row['fournisseur'] ?? 'NULL') . "\n";
        echo "  Catégorie: " . ($row['categorie'] ?? 'NULL') . "\n";
        echo "  Statut: " . ($row['statut'] ?? 'NULL') . "\n";
        echo "  Montant: " . ($row['montant_total'] ?? 'NULL') . "\n";
    }
} else {
    echo "Aucune donnée\n";
}

$conn->close();
?>
