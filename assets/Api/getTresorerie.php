<?php
/**
 * API - Récupération des données de trésorerie
 * Retourne les achats, dépenses, et statistiques financières
 */

// Désactiver l'affichage des erreurs PHP dans la sortie
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

session_start();

// Vérifier la session (permettre aussi session_useres pour compatibilité)
if (!isset($_SESSION['user_id']) && !isset($_SESSION['session_useres'])) {
    echo json_encode(['success' => false, 'message' => 'Non connecté']);
    exit;
}

try {
    $id_magasin = $_SESSION['id_magasin'] ?? 1;
    $achats = [];
    $depenses = [];
    
    // Vérifier si la table stock_entrees existe
    $table_check = $conn->query("SHOW TABLES LIKE 'stock_entrees'");
    $stock_entrees_exists = $table_check && $table_check->num_rows > 0;
    
    // Vérifier si la table mouvements_tresorerie existe
    $table_check2 = $conn->query("SHOW TABLES LIKE 'mouvements_tresorerie'");
    $mouvements_exists = $table_check2 && $table_check2->num_rows > 0;
    
    // Récupérer les achats depuis mouvements_tresorerie (type_mouvement = 'achat')
    if ($mouvements_exists) {
        // Vérifier les colonnes disponibles
        $col_check_fournisseur = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'fournisseur'");
        $has_fournisseur = $col_check_fournisseur && $col_check_fournisseur->num_rows > 0;
        
        $col_check_facture = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'numero_facture'");
        $has_facture = $col_check_facture && $col_check_facture->num_rows > 0;
        
        $col_check_statut = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'statut'");
        $has_statut = $col_check_statut && $col_check_statut->num_rows > 0;
        
        $sql_achats = "SELECT 
            id_mouvement as id_entree,
            date_mouvement as date,
            " . ($has_fournisseur ? "fournisseur," : "description as fournisseur,") . "
            " . ($has_facture ? "numero_facture," : "reference as numero_facture,") . "
            montant,
            devise,
            description,
            categorie,
            " . ($has_statut ? "statut" : "'payee' as statut") . "
        FROM mouvements_tresorerie
        WHERE id_magasin = ? 
        AND type_mouvement = 'achat'
        ORDER BY date_mouvement DESC
        LIMIT 50";
        
        $stmt = $conn->prepare($sql_achats);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_achats = $stmt->get_result();
            $achats = $result_achats->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    // Récupérer les dépenses si la table existe (exclure les achats car gérés séparément)
    if ($mouvements_exists) {
        // Vérifier si la colonne mode_paiement existe
        $col_check = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'mode_paiement'");
        $has_mode_paiement = $col_check && $col_check->num_rows > 0;
        
        // Récupérer les dépenses (exclure entrées, ventes et achats)
        $sql_depenses = "SELECT 
            id_mouvement as id,
            date_mouvement as date,
            type_mouvement,
            montant,
            devise,
            description,
            categorie,
            " . ($has_mode_paiement ? "mode_paiement," : "'cash' as mode_paiement,") . "
            user_id
        FROM mouvements_tresorerie
        WHERE id_magasin = ? 
        AND type_mouvement NOT IN ('entree', 'vente', 'achat')
        ORDER BY date_mouvement DESC
        LIMIT 50";
        
        $stmt = $conn->prepare($sql_depenses);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_depenses = $stmt->get_result();
            $depenses = $result_depenses->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    // Initialiser les valeurs par défaut
    $revenus = ['revenus_cdf' => 0, 'revenus_usd' => 0, 'nb_ventes' => 0];
    $benefice_brut = ['benefice_brut_cdf' => 0, 'benefice_brut_usd' => 0];
    $depenses_mois = ['depenses_cdf' => 0, 'depenses_usd' => 0];
    $achats_mois = ['achats_cdf' => 0, 'achats_usd' => 0];
    $factures_attente = ['nb_factures_attente' => 0];
    $flux_tresorerie = [];
    $categories_depenses = [];
    
    // Récupérer les revenus (ventes) - utiliser id_magasin_vente
    $sql_revenus = "SELECT 
        SUM(CASE WHEN devise = 'CDF' THEN total ELSE 0 END) as revenus_cdf,
        SUM(CASE WHEN devise = 'USD' THEN total ELSE 0 END) as revenus_usd,
        COUNT(*) as nb_ventes
    FROM ventes
    WHERE id_magasin_vente = ?
    AND DATE_FORMAT(date_vente, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    AND statut = 'completed'";
    
    $stmt = $conn->prepare($sql_revenus);
    if ($stmt) {
        $stmt->bind_param('i', $id_magasin);
        $stmt->execute();
        $result_revenus = $stmt->get_result();
        $revenus = $result_revenus->fetch_assoc() ?: $revenus;
    }
    
    // Calculer le bénéfice brut (prix vente - prix achat) des produits vendus
    $sql_benefice = "SELECT 
        SUM(CASE WHEN v.devise = 'CDF' THEN (vd.price_unit - p.prix_achat) * vd.quantity ELSE 0 END) as benefice_brut_cdf,
        SUM(CASE WHEN v.devise = 'USD' THEN (vd.price_unit - p.prix_achat) * vd.quantity ELSE 0 END) as benefice_brut_usd
    FROM ventes v
    INNER JOIN vente_details vd ON v.id_vente = vd.id_vente
    INNER JOIN produit p ON vd.id_produit = p.id_produit
    WHERE v.id_magasin_vente = ?
    AND DATE_FORMAT(v.date_vente, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    AND v.statut = 'completed'";
    
    $stmt = $conn->prepare($sql_benefice);
    if ($stmt) {
        $stmt->bind_param('i', $id_magasin);
        $stmt->execute();
        $result_benefice = $stmt->get_result();
        $benefice_brut = $result_benefice->fetch_assoc() ?: $benefice_brut;
    }
    
    // Calculer les dépenses du mois (si table existe)
    if ($mouvements_exists) {
        $sql_depenses_mois = "SELECT 
            SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as depenses_cdf,
            SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as depenses_usd
        FROM mouvements_tresorerie
        WHERE id_magasin = ?
        AND type_mouvement NOT IN ('entree', 'vente')
        AND DATE_FORMAT(date_mouvement, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')";
        
        $stmt = $conn->prepare($sql_depenses_mois);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_depenses_mois = $stmt->get_result();
            $depenses_mois = $result_depenses_mois->fetch_assoc() ?: $depenses_mois;
        }
        
        // Catégories de dépenses
        $sql_categories = "SELECT 
            COALESCE(categorie, type_mouvement) as categorie,
            SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as montant_cdf,
            SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as montant_usd,
            COUNT(*) as nb_transactions
        FROM mouvements_tresorerie
        WHERE id_magasin = ?
        AND DATE_FORMAT(date_mouvement, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        AND type_mouvement NOT IN ('entree', 'vente', 'achat')
        GROUP BY COALESCE(categorie, type_mouvement)";
        
        $stmt = $conn->prepare($sql_categories);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_categories = $stmt->get_result();
            $categories_depenses = $result_categories->fetch_all(MYSQLI_ASSOC);
        }
        
        // Calculer les achats du mois depuis mouvements_tresorerie
        $sql_achats_mois = "SELECT 
            SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as achats_cdf,
            SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as achats_usd
        FROM mouvements_tresorerie
        WHERE id_magasin = ?
        AND type_mouvement = 'achat'
        AND DATE_FORMAT(date_mouvement, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')";
        
        $stmt = $conn->prepare($sql_achats_mois);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_achats_mois = $stmt->get_result();
            $achats_mois = $result_achats_mois->fetch_assoc() ?: $achats_mois;
        }
        
        // Calculer les dépenses du mois (exclure achats)
        $sql_depenses_total = "SELECT 
            SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END) as depenses_cdf,
            SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END) as depenses_usd
        FROM mouvements_tresorerie
        WHERE id_magasin = ?
        AND type_mouvement NOT IN ('entree', 'vente', 'achat')
        AND DATE_FORMAT(date_mouvement, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')";
        
        $stmt = $conn->prepare($sql_depenses_total);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_depenses_total = $stmt->get_result();
            $depenses_mois = $result_depenses_total->fetch_assoc() ?: $depenses_mois;
        }
    }
    
    // Récupérer les factures en attente
    if ($mouvements_exists) {
        $sql_factures_attente = "SELECT COUNT(*) as nb_factures_attente
        FROM mouvements_tresorerie
        WHERE id_magasin = ?
        AND type_mouvement = 'achat'
        AND statut = 'en_attente'";
        
        $stmt = $conn->prepare($sql_factures_attente);
        if ($stmt) {
            $stmt->bind_param('i', $id_magasin);
            $stmt->execute();
            $result_factures = $stmt->get_result();
            $factures_attente = $result_factures->fetch_assoc() ?: $factures_attente;
        }
    }
    
    // Flux de trésorerie des 30 derniers jours
    $sql_flux = "SELECT 
        DATE(date_vente) as date,
        SUM(CASE WHEN devise = 'CDF' THEN total ELSE 0 END) as revenus_cdf,
        SUM(CASE WHEN devise = 'USD' THEN total ELSE 0 END) as revenus_usd
    FROM ventes
    WHERE id_magasin_vente = ?
    AND date_vente >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND statut = 'completed'
    GROUP BY DATE(date_vente)
    ORDER BY date ASC";
    
    $stmt = $conn->prepare($sql_flux);
    if ($stmt) {
        $stmt->bind_param('i', $id_magasin);
        $stmt->execute();
        $result_flux = $stmt->get_result();
        $flux_tresorerie = $result_flux->fetch_all(MYSQLI_ASSOC);
    }
    
    echo json_encode([
        'success' => true,
        'achats' => $achats,
        'depenses' => $depenses,
        'stats' => [
            'revenus_cdf' => floatval($revenus['revenus_cdf'] ?? 0),
            'revenus_usd' => floatval($revenus['revenus_usd'] ?? 0),
            'benefice_brut_cdf' => floatval($benefice_brut['benefice_brut_cdf'] ?? 0),
            'benefice_brut_usd' => floatval($benefice_brut['benefice_brut_usd'] ?? 0),
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
