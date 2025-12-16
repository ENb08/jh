<?php
header('Content-Type: application/json; charset=utf-8');

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Charger la base de données
require_once 'db.php';

if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Erreur connexion BD']);
    exit;
}

// Vérifier la session utilisateur
$id_users = isset($_SESSION['id_users']) ? intval($_SESSION['id_users']) : 0;
$numero_tele = isset($_SESSION['numero_tele']) ? $_SESSION['numero_tele'] : '';

if ($id_users <= 0) {
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

try {
    // Récupérer les informations de l'utilisateur connecté
    $sql_user = "SELECT id_users, users_name, numero_tele, role_users, id_magasin 
                 FROM users_jh 
                 WHERE id_users = ? LIMIT 1";
    $stmt_user = $conn->prepare($sql_user);
    $stmt_user->bind_param("i", $id_users);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    
    if ($result_user->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
        exit;
    }
    
    $user = $result_user->fetch_assoc();
    $stmt_user->close();
    
    // Récupérer les ventes du jour (aujourd'hui)
    $today = date('Y-m-d');
    $sql_ventes_jour = "SELECT 
                            COUNT(*) as nb_ventes,
                            COALESCE(SUM(total), 0) as total_ventes,
                            devise
                        FROM ventes
                        WHERE DATE(date_vente) = ? 
                        AND id_session = ?
                        GROUP BY devise";
    
    $stmt_ventes = $conn->prepare($sql_ventes_jour);
    $stmt_ventes->bind_param("si", $today, $id_users);
    $stmt_ventes->execute();
    $result_ventes = $stmt_ventes->get_result();
    
    $ventes_jour = [];
    $total_ventes_cdf = 0;
    $total_ventes_usd = 0;
    $nb_ventes_total = 0;
    
    while ($vente = $result_ventes->fetch_assoc()) {
        $ventes_jour[] = $vente;
        $nb_ventes_total += intval($vente['nb_ventes']);
        
        if ($vente['devise'] === 'CDF') {
            $total_ventes_cdf = floatval($vente['total_ventes']);
        } else {
            $total_ventes_usd = floatval($vente['total_ventes']);
        }
    }
    $stmt_ventes->close();
    
    // Récupérer le nombre de clients (compter les ventes avec paiements uniques du jour)
    $sql_clients = "SELECT COUNT(DISTINCT id_vente) as nb_clients 
                    FROM ventes 
                    WHERE DATE(date_vente) = ? 
                    AND id_session = ?";
    $stmt_clients = $conn->prepare($sql_clients);
    $stmt_clients->bind_param("si", $today, $id_users);
    $stmt_clients->execute();
    $result_clients = $stmt_clients->get_result();
    $clients = $result_clients->fetch_assoc();
    $nb_clients = intval($clients['nb_clients']);
    $stmt_clients->close();
    
    // Récupérer les produits en alerte stock (stock < 10)
    $sql_alerts = "SELECT COUNT(*) as nb_alerts
                   FROM magasin_stock ms
                   INNER JOIN produit p ON ms.id_produit = p.id_produit
                   WHERE ms.quantite_magasin < 10
                   AND ms.id_session = ?";
    $stmt_alerts = $conn->prepare($sql_alerts);
    $stmt_alerts->bind_param("s", $numero_tele);
    $stmt_alerts->execute();
    $result_alerts = $stmt_alerts->get_result();
    $alerts = $result_alerts->fetch_assoc();
    $nb_alerts = intval($alerts['nb_alerts']);
    $stmt_alerts->close();
    
    // Récupérer les 10 dernières ventes
    $sql_recent = "SELECT 
                    v.id_vente,
                    v.date_vente,
                    v.total,
                    v.devise,
                    v.mode_paiement,
                    v.statut,
                    COUNT(vd.id_detail) as nb_articles
                FROM ventes v
                LEFT JOIN vente_details vd ON v.id_vente = vd.id_vente
                WHERE v.id_session = ?
                GROUP BY v.id_vente
                ORDER BY v.date_vente DESC
                LIMIT 10";
    
    $stmt_recent = $conn->prepare($sql_recent);
    $stmt_recent->bind_param("i", $id_users);
    $stmt_recent->execute();
    $result_recent = $stmt_recent->get_result();
    
    $recent_ventes = [];
    while ($vente = $result_recent->fetch_assoc()) {
        $recent_ventes[] = $vente;
    }
    $stmt_recent->close();
    
    // Réponse JSON
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id_users'],
            'name' => $user['users_name'],
            'phone' => $user['numero_tele'],
            'role' => $user['role_users'],
            'id_magasin' => $user['id_magasin']
        ],
        'stats' => [
            'ventes_jour' => [
                'nb_ventes' => $nb_ventes_total,
                'total_cdf' => round($total_ventes_cdf, 2),
                'total_usd' => round($total_ventes_usd, 2)
            ],
            'nb_clients' => $nb_clients,
            'nb_alerts_stock' => $nb_alerts
        ],
        'recent_ventes' => $recent_ventes
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
