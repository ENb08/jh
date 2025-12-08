<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php'; // Assurez-vous que ce chemin est correct

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Récupération de l'ID de session, converti en entier. Vaut 0 si non défini.
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

// Correction: Vérification si l'ID est nul ou non valide (doit être un nombre > 0)
// L'opérateur de comparaison '===' est utilisé, et on vérifie si l'ID est 0.
if ($id_session === 0) {
    // Si la session n'est pas valide, on redirige/déconnecte l'utilisateur
    // NOTE: Le fichier 'logout.php' doit contenir une redirection et/ou un 'exit;'
    require_once 'logout.php';
    // On s'assure de renvoyer une réponse JSON d'erreur et de terminer l'exécution
    echo json_encode(['success' => false, 'message' => 'Session invalide. Veuillez vous reconnecter.']);
    exit;
} else {
    // La session est valide, on exécute la requête sécurisée.
    
    // Requête préparée pour éviter l'injection SQL
    // La jointure avec users_jh a été retirée car elle est redondante pour le simple filtrage.
    $sql = "SELECT
                produit.id_produit AS id,
                produit.reference AS code, 
                produit.nom_produit AS name, 
                produit.categorie AS category,
                produit.prix_achat AS buy_price, 
                produit.prix_vente AS sale_price, 
                produit.quantite_stock,
                produit.quantite_alerte AS alert_threshold 
            FROM
                produit
            WHERE
                produit.id_session = ?
            ORDER BY nom_produit ASC";

    // Préparation de la requête
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur de préparation SQL: ' . $conn->error]);
        exit;
    }

    // Liaison du paramètre: 'i' pour un entier ($id_session)
    $stmt->bind_param("i", $id_session);
    
    // Exécution
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'exécution de la requête: ' . $stmt->error]);
        exit;
    }

    $result = $stmt->get_result();

    $products = [];
    while ($row = $result->fetch_assoc()) {
        // === ADAPTATION POUR LE JAVASCRIPT ===
        // Mappe le stock unique sur le dépôt principal pour la compatibilité avec script_stock.js
        $row['depot_principal'] = (int)$row['quantite_stock'];
        $row['depot_reserve'] = 0;
        $row['depot_vitrine'] = 0;
        
        unset($row['quantite_stock']); 
        // ======================================
        
        $products[] = $row;
    }
    
    $stmt->close();
}

echo json_encode($products);
$conn->close();
?>