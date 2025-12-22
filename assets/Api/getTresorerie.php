<?php
/**
 * API - Récupération des données de trésorerie
 * Retourne les achats, dépenses, et statistiques financières
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

session_start();

// Vérifier la session
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

try {
    $id_magasin = $_SESSION['id_magasin'] ?? 1;
    
    // Récupérer les achats (entrées de stock)
    $sql_achats = "SELECT 
        se.id_entree,
        se.date_entree as date,
        se.fournisseur,
        se.numero_facture,
        se.montant_total as montant,
        se.devise,
        se.description,
        COUNT(sed.id_detail) as nb_articles
    FROM stock_entrees se
    LEFT JOIN stock_entrees_details sed ON se.id_entree = sed.id_entree
    WHERE se.id_magasin = ?
    GROUP BY se.id_entree
    ORDER BY se.date_entree DESC
    LIMIT 50";
    
    $stmt = $conn->prepare($sql_achats);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_achats = $stmt->get_result();
    $achats = $result_achats->fetch_all(MYSQLI_ASSOC);
    
    // Récupérer les dépenses (mouvements négatifs de caisse)
    $sql_depenses = "SELECT 
        id_mouvement as id,
        date_mouvement as date,
        type_mouvement,
        montant,
        devise,
        description,
        user_id
    FROM mouvements_tresorerie
    WHERE id_magasin = ? 
    AND type_mouvement IN ('sortie', 'depense')
    ORDER BY date_mouvement DESC
    LIMIT 50";
    
    $stmt = $conn->prepare($sql_depenses);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_depenses = $stmt->get_result();
    $depenses = $result_depenses->fetch_all(MYSQLI_ASSOC);
    
    // Récupérer les revenus (ventes)
    $sql_revenus = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN total ELSE 0 END) as revenus_cdf,
        SUM(CASE WHEN devise = 'USD' THEN total ELSE 0 END) as revenus_usd,
        COUNT(*) as nb_ventes
    FROM ventes
    WHERE id_magasin = ?
    AND DATE_FORMAT(date_vente, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    AND statut = 'completed'";
    
    $stmt = $conn->prepare($sql_revenus);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_revenus = $stmt->get_result();
    $revenus = $result_revenus->fetch_assoc();
    
    // Calculer les dépenses du mois
    $sql_depenses_mois = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as depenses_cdf,
        SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as depenses_usd
    FROM mouvements_tresorerie
    WHERE id_magasin = ?
    AND type_mouvement IN ('sortie', 'depense')
    AND DATE_FORMAT(date_mouvement, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')";
    
    $stmt = $conn->prepare($sql_depenses_mois);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_depenses_mois = $stmt->get_result();
    $depenses_mois = $result_depenses_mois->fetch_assoc();
    
    // Calculer les achats du mois
    $sql_achats_mois = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN montant_total ELSE 0 END) as achats_cdf,
        SUM(CASE WHEN devise = 'USD' THEN montant_total ELSE 0 END) as achats_usd
    FROM stock_entrees
    WHERE id_magasin = ?
    AND DATE_FORMAT(date_entree, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')";
    
    $stmt = $conn->prepare($sql_achats_mois);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_achats_mois = $stmt->get_result();
    $achats_mois = $result_achats_mois->fetch_assoc();
    
    // Récupérer les factures en attente (entrées non payées)
    $sql_factures_attente = "SELECT COUNT(*) as nb_factures_attente
    FROM stock_entrees
    WHERE id_magasin = ?
    AND (statut = 'en_attente' OR statut IS NULL)";
    
    $stmt = $conn->prepare($sql_factures_attente);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_factures = $stmt->get_result();
    $factures_attente = $result_factures->fetch_assoc();
    
    // Flux de trésorerie des 30 derniers jours
    $sql_flux = "SELECT 
        DATE(date_vente) as date,
        SUM(CASE WHEN devise = 'CDF' THEN total ELSE 0 END) as revenus_cdf,
        SUM(CASE WHEN devise = 'USD' THEN total ELSE 0 END) as revenus_usd
    FROM ventes
    WHERE id_magasin = ?
    AND date_vente >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND statut = 'completed'
    GROUP BY DATE(date_vente)
    ORDER BY date ASC";
    
    $stmt = $conn->prepare($sql_flux);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_flux = $stmt->get_result();
    $flux_tresorerie = $result_flux->fetch_all(MYSQLI_ASSOC);
    
    // Catégories de dépenses
    $sql_categories = "SELECT 
        type_mouvement as categorie,
        SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as montant_cdf,
        SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as montant_usd,
        COUNT(*) as nb_transactions
    FROM mouvements_tresorerie
    WHERE id_magasin = ?
    AND DATE_FORMAT(date_mouvement, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    AND type_mouvement IN ('sortie', 'depense')
    GROUP BY type_mouvement";
    
    $stmt = $conn->prepare($sql_categories);
    $stmt->bind_param('i', $id_magasin);
    $stmt->execute();
    $result_categories = $stmt->get_result();
    $categories_depenses = $result_categories->fetch_all(MYSQLI_ASSOC);
    
    echo json_encode([
        'success' => true,
        'achats' => $achats,
        'depenses' => $depenses,
        'stats' => [
            'revenus_cdf' => floatval($revenus['revenus_cdf'] ?? 0),
            'revenus_usd' => floatval($revenus['revenus_usd'] ?? 0),
            'depenses_cdf' => floatval($depenses_mois['depenses_cdf'] ?? 0),
            'depenses_usd' => floatval($depenses_mois['depenses_usd'] ?? 0),
            'achats_cdf' => floatval($achats_mois['achats_cdf'] ?? 0),
            'achats_usd' => floatval($achats_mois['achats_usd'] ?? 0),
            'nb_ventes' => intval($revenus['nb_ventes'] ?? 0),
            'factures_attente' => intval($factures_attente['nb_factures_attente'] ?? 0)
        ],
        'flux_tresorerie' => $flux_tresorerie,
        'categories_depenses' => $categories_depenses
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}

$conn->close();
