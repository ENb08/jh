<?php
/**
 * API - Générer un rapport de trésorerie
 * Retourne un résumé financier pour une période donnée
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

try {
    $id_magasin = $_SESSION['id_magasin'] ?? 1;
    $date_debut = $_GET['date_debut'] ?? date('Y-m-01');
    $date_fin = $_GET['date_fin'] ?? date('Y-m-d');
    
    // Revenus (ventes)
    $sql_revenus = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN total ELSE 0 END) as revenus_cdf,
        SUM(CASE WHEN devise = 'USD' THEN total ELSE 0 END) as revenus_usd,
        COUNT(*) as nb_ventes
    FROM ventes
    WHERE id_magasin = ?
    AND DATE(date_vente) BETWEEN ? AND ?
    AND statut = 'completed'";
    
    $stmt = $conn->prepare($sql_revenus);
    $stmt->bind_param('iss', $id_magasin, $date_debut, $date_fin);
    $stmt->execute();
    $revenus = $stmt->get_result()->fetch_assoc();
    
    // Achats
    $sql_achats = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN montant_total ELSE 0 END) as achats_cdf,
        SUM(CASE WHEN devise = 'USD' THEN montant_total ELSE 0 END) as achats_usd,
        COUNT(*) as nb_achats
    FROM stock_entrees
    WHERE id_magasin = ?
    AND DATE(date_entree) BETWEEN ? AND ?";
    
    $stmt = $conn->prepare($sql_achats);
    $stmt->bind_param('iss', $id_magasin, $date_debut, $date_fin);
    $stmt->execute();
    $achats = $stmt->get_result()->fetch_assoc();
    
    // Dépenses
    $sql_depenses = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as depenses_cdf,
        SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as depenses_usd,
        COUNT(*) as nb_depenses
    FROM mouvements_tresorerie
    WHERE id_magasin = ?
    AND DATE(date_mouvement) BETWEEN ? AND ?
    AND type_mouvement IN ('sortie', 'depense')";
    
    $stmt = $conn->prepare($sql_depenses);
    $stmt->bind_param('iss', $id_magasin, $date_debut, $date_fin);
    $stmt->execute();
    $depenses = $stmt->get_result()->fetch_assoc();
    
    // Détail par catégorie
    $sql_categories = "SELECT 
        COALESCE(categorie, 'Non catégorisé') as categorie,
        SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as montant_cdf,
        SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as montant_usd,
        COUNT(*) as nb_transactions
    FROM mouvements_tresorerie
    WHERE id_magasin = ?
    AND DATE(date_mouvement) BETWEEN ? AND ?
    AND type_mouvement IN ('sortie', 'depense')
    GROUP BY categorie
    ORDER BY montant_cdf DESC, montant_usd DESC";
    
    $stmt = $conn->prepare($sql_categories);
    $stmt->bind_param('iss', $id_magasin, $date_debut, $date_fin);
    $stmt->execute();
    $categories = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // Calculer les bénéfices
    $revenus_total_cdf = floatval($revenus['revenus_cdf'] ?? 0);
    $revenus_total_usd = floatval($revenus['revenus_usd'] ?? 0);
    $achats_total_cdf = floatval($achats['achats_cdf'] ?? 0);
    $achats_total_usd = floatval($achats['achats_usd'] ?? 0);
    $depenses_total_cdf = floatval($depenses['depenses_cdf'] ?? 0);
    $depenses_total_usd = floatval($depenses['depenses_usd'] ?? 0);
    
    $benefice_cdf = $revenus_total_cdf - $achats_total_cdf - $depenses_total_cdf;
    $benefice_usd = $revenus_total_usd - $achats_total_usd - $depenses_total_usd;
    
    echo json_encode([
        'success' => true,
        'periode' => [
            'debut' => $date_debut,
            'fin' => $date_fin
        ],
        'revenus' => [
            'cdf' => $revenus_total_cdf,
            'usd' => $revenus_total_usd,
            'nb_ventes' => intval($revenus['nb_ventes'] ?? 0)
        ],
        'achats' => [
            'cdf' => $achats_total_cdf,
            'usd' => $achats_total_usd,
            'nb_achats' => intval($achats['nb_achats'] ?? 0)
        ],
        'depenses' => [
            'cdf' => $depenses_total_cdf,
            'usd' => $depenses_total_usd,
            'nb_depenses' => intval($depenses['nb_depenses'] ?? 0)
        ],
        'benefice' => [
            'cdf' => $benefice_cdf,
            'usd' => $benefice_usd
        ],
        'categories' => $categories
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur: ' . $e->getMessage()
    ]);
}

$conn->close();
