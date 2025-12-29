<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

require_once 'assets/Api/db.php';

echo "=== TEST DEPENSES ===\n\n";

// Vérifier la connexion
echo "1. Connexion DB: " . ($conn ? "OK" : "ERREUR") . "\n";

// Vérifier si la table existe
$result = $conn->query("SHOW TABLES LIKE 'mouvements_tresorerie'");
$table_existe = $result && $result->num_rows > 0;
echo "2. Table mouvements_tresorerie existe: " . ($table_existe ? "OUI" : "NON") . "\n";

if ($table_existe) {
    // Compter les lignes
    $result = $conn->query("SELECT COUNT(*) as total FROM mouvements_tresorerie");
    $row = $result->fetch_assoc();
    echo "3. Nombre total de lignes: " . $row['total'] . "\n";
    
    // Compter les dépenses/sorties
    $result = $conn->query("SELECT COUNT(*) as total FROM mouvements_tresorerie WHERE type_mouvement IN ('sortie', 'depense')");
    $row = $result->fetch_assoc();
    echo "4. Nombre de dépenses/sorties: " . $row['total'] . "\n";
    
    // Afficher les 5 premières lignes
    echo "\n5. Données de la table:\n";
    $result = $conn->query("SELECT * FROM mouvements_tresorerie ORDER BY date_mouvement DESC LIMIT 5");
    while ($row = $result->fetch_assoc()) {
        print_r($row);
    }
    
    // Structure de la table
    echo "\n6. Structure de la table:\n";
    $result = $conn->query("DESCRIBE mouvements_tresorerie");
    while ($row = $result->fetch_assoc()) {
        echo "   - " . $row['Field'] . " (" . $row['Type'] . ")\n";
    }
} else {
    echo "\n>>> La table n'existe pas! Vous devez la créer.\n";
    echo ">>> Exécutez le fichier assets/Api/create_tresorerie_tables.sql dans phpMyAdmin\n";
}

$conn->close();
