<?php
// Désactiver l'affichage des erreurs
error_reporting(0);
ini_set('display_errors', 0);

// Header JSON en premier
header('Content-Type: application/json; charset=utf-8');

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Charger la base de données
require_once 'db.php';

// Vérifier la connexion
if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Erreur connexion BD']);
    exit;
}

// Vérifier la méthode POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Récupérer l'ID utilisateur connecté
$id_users = isset($_SESSION['id_users']) ? intval($_SESSION['id_users']) : 0;
$numero_tele_session = isset($_SESSION['session_useres']) ? $_SESSION['session_useres'] : '';
$id_magasin_vente = isset($_SESSION['id_magasin']) ? intval($_SESSION['id_magasin']) : 0;

if ($id_users <= 0 || empty($numero_tele_session)) {
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

// Récupérer les données JSON
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Données JSON invalides']);
    exit;
}

// Extraire les données
$items = isset($data['items']) ? $data['items'] : [];
$mode_paiement = isset($data['payment_mode']) ? trim($data['payment_mode']) : 'cash';
$devise = isset($data['currency']) ? trim($data['currency']) : 'CDF';
$remise_pourcent = isset($data['discount']) ? floatval($data['discount']) : 0;
$montant_recu = isset($data['amount_received']) ? floatval($data['amount_received']) : 0;
$taux_usd = isset($data['taux_usd']) ? floatval($data['taux_usd']) : 2400;

// Vérifications
if (empty($items)) {
    echo json_encode(['success' => false, 'message' => 'Le panier est vide']);
    exit;
}

// Déterminer le nom correct de la colonne stock dans magasin_stock
$result_cols = $conn->query("SHOW COLUMNS FROM magasin_stock");
$columns = [];
$stock_column = 'quantite_stock'; // Par défaut

while ($col = $result_cols->fetch_assoc()) {
    $col_name = $col['Field'];
    $columns[] = $col_name;
    if (in_array($col_name, ['quantity_magasin', 'quantite_magasin', 'quantite_stock', 'stock', 'quantity'])) {
        $stock_column = $col_name;
    }
}

// Vérifier si la colonne id_magasin_stock existe
$has_magasin_column = in_array('id_magasin_stock', $columns);

// Commencer la transaction
$conn->begin_transaction();

try {
    // Calculer le sous-total
    $sous_total = 0;
    
    foreach ($items as $item) {
        if (!isset($item['id']) || !isset($item['qty'])) {
            throw new Exception('Données item invalides');
        }
        
        $price = $devise === 'CDF' ? floatval($item['price_cdf']) : floatval($item['price_usd']);
        $qty = intval($item['qty']);
        
        if ($qty <= 0) {
            throw new Exception('Quantité invalide');
        }
        
        $sous_total += $price * $qty;
    }
    
    // Calculer le montant de la remise
    $montant_remise = 0;
    if ($remise_pourcent > 0) {
        $montant_remise = $sous_total * ($remise_pourcent / 100);
    }
    
    // Sous-total après remise
    $subtotal_apres_remise = $sous_total - $montant_remise;
    
    // Total = sous-total après remise
    $total = $subtotal_apres_remise;
    
    // Calculer la monnaie
    $monnaie = 0;
    if ($mode_paiement === 'cash') {
        $monnaie = max(0, $montant_recu - $total);
    }
    
    // Date de vente
    $date_vente = date('Y-m-d H:i:s');
    $statut = 'completed';
    
    // Insérer la vente
    $sql_vente = "INSERT INTO ventes 
                  (id_session, id_magasin_vente, date_vente, mode_paiement, devise, 
                   sous_total, remise_pourcent, montant_remise, total, 
                   montant_recu, monnaie, taux_usd, statut, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt_vente = $conn->prepare($sql_vente);
    
    if (!$stmt_vente) {
        throw new Exception('Erreur préparation vente: ' . $conn->error);
    }
    
    $stmt_vente->bind_param("iisssddddddds", 
        $id_users, 
        $id_magasin_vente, 
        $date_vente,
        $mode_paiement, 
        $devise, 
        $sous_total,
        $remise_pourcent,
        $montant_remise,
        $total, 
        $montant_recu, 
        $monnaie,
        $taux_usd,
        $statut
    );
    
    if (!$stmt_vente->execute()) {
        throw new Exception('Erreur insertion vente: ' . $stmt_vente->error);
    }
    
    $id_vente = $conn->insert_id;
    $stmt_vente->close();
    
    // Traiter chaque item
    foreach ($items as $item) {
        $id_produit = intval($item['id']);
        $qty = intval($item['qty']);
        $price_unit = $devise === 'CDF' ? floatval($item['price_cdf']) : floatval($item['price_usd']);
        $price_total = $price_unit * $qty;
        
        // Vérifier le stock avec requête complète (jointures multiples)
        $sql_check = "SELECT 
                        ms.id_magasin_stock,
                        ms.quantite_magasin,
                        ms.date_derniere_appro,
                        p.id_produit,
                        p.prix_achat,
                        p.prix_vente,
                        m.id_magasin AS id_magasin_associe,
                        u.id_users AS id_utilisateur_session,
                        u.numero_tele AS session_utilisateur_tele
                    FROM magasin_stock ms
                    INNER JOIN produit p ON ms.id_produit = p.id_produit
                    INNER JOIN users_jh u ON ms.id_session = u.numero_tele
                    INNER JOIN magasin m ON u.id_magasin = m.id_magasin
                    WHERE p.id_session = u.numero_tele
                        AND ms.id_session = p.id_session
                        AND p.id_produit = " . $id_produit . "
                        AND u.numero_tele = '" . $conn->real_escape_string($numero_tele_session) . "'
                    LIMIT 1";
        
        $result_check = $conn->query($sql_check);
        
        if (!$result_check) {
            throw new Exception('Erreur requête stock: ' . $conn->error);
        }
        
        // Si le produit n'existe pas dans magasin_stock avec toutes les jointures
        if ($result_check->num_rows === 0) {

            throw new Exception('Produit ' . $id_produit .$numero_tele_session. ' non trouvé ou non associé à votre session/magasin');
            
        }
        
        $row = $result_check->fetch_assoc();
        $stock_actuel = intval($row['quantite_magasin']);
        
        if ($stock_actuel < $qty) {
            throw new Exception('Stock insuffisant pour produit ID ' . $id_produit . ' (Disponible: ' . $stock_actuel . ', Demandé: ' . $qty . ')');
        }
        
        // Insérer le détail
        $sql_detail = "INSERT INTO vente_details 
                       (id_vente, id_produit, quantity, price_unit, price_total, currency) 
                       VALUES (" . $id_vente . ", " . $id_produit . ", " . $qty . ", " . $price_unit . ", " . $price_total . ", '" . $devise . "')";
        
        if (!$conn->query($sql_detail)) {
            throw new Exception('Erreur insertion détail: ' . $conn->error);
        }
        
        // Mettre à jour le stock
        $sql_update = "UPDATE magasin_stock 
                       SET quantite_magasin = quantite_magasin - " . $qty . " 
                       WHERE id_produit = " . $id_produit . " 
                       AND id_session = '" . $conn->real_escape_string($numero_tele_session) . "'";
        
        if (!$conn->query($sql_update)) {
            throw new Exception('Erreur MAJ stock: ' . $conn->error);
        }
        
        if ($conn->affected_rows === 0) {
            throw new Exception('Aucune ligne mise à jour pour produit ' . $id_produit);
        }
    }
    
    // Valider la transaction
    $conn->commit();
    
    // Récupérer les détails complets de la vente après insertion
    $sql_vente_details = "SELECT 
                            v.id_vente,
                            v.date_vente,
                            v.mode_paiement,
                            v.devise,
                            v.sous_total,
                            v.remise_pourcent,
                            v.montant_remise,
                            v.total,
                            v.montant_recu,
                            v.monnaie,
                            v.taux_usd,
                            v.statut,
                            COUNT(vd.id_detail) as nb_lignes_details,
                            SUM(vd.quantity) as total_articles,
                            SUM(vd.price_total) as somme_lignes
                        FROM ventes v
                        LEFT JOIN vente_details vd ON v.id_vente = vd.id_vente
                        WHERE v.id_vente = " . $id_vente . "
                        GROUP BY v.id_vente";
    
    $result_vente = $conn->query($sql_vente_details);
    $vente_info = $result_vente ? $result_vente->fetch_assoc() : [];
    
    // Récupérer les articles vendus avec leurs informations produit
    $sql_articles = "SELECT 
                        vd.id_detail,
                        vd.id_produit,
                        vd.quantity,
                        vd.price_unit,
                        vd.price_total,
                        vd.currency,
                        p.reference as reference_produit,
                        p.prix_achat,
                        p.prix_vente
                    FROM vente_details vd
                    INNER JOIN produit p ON vd.id_produit = p.id_produit
                    WHERE vd.id_vente = " . $id_vente;
    
    $result_articles = $conn->query($sql_articles);
    $articles_vendus = [];
    
    if ($result_articles) {
        while ($article = $result_articles->fetch_assoc()) {
            $articles_vendus[] = $article;
        }
    }
    
    // Calcul de la marge bénéficiaire
    $total_marge = 0;
    foreach ($articles_vendus as $article) {
        $prix_achat_unitaire = floatval($article['prix_achat']);
        $prix_vente_unitaire = floatval($article['price_unit']);
        $qte = intval($article['quantity']);
        
        $marge_unitaire = $prix_vente_unitaire - $prix_achat_unitaire;
        $marge_totale_article = $marge_unitaire * $qte;
        $total_marge += $marge_totale_article;
    }
    
    $taux_marge = $sous_total > 0 ? round(($total_marge / $sous_total) * 100, 2) : 0;
    
    // Réponse succès avec calculs détaillés
    echo json_encode([
        'success' => true,
        'message' => 'Vente enregistrée avec succès',
        'data' => [
            'id_vente' => $id_vente,
            'total' => round($total, 2),
            'monnaie' => round($monnaie, 2),
            'devise' => $devise,
            'mode_paiement' => $mode_paiement,
            'nb_articles' => count($items),
            'calculs' => [
                'sous_total' => round($sous_total, 2),
                'montant_remise' => round($montant_remise, 2),
                'remise_pourcent' => $remise_pourcent,
                'subtotal_apres_remise' => round($subtotal_apres_remise, 2),
                'total_final' => round($total, 2),
                'montant_recu' => round($montant_recu, 2),
                'monnaie_rendue' => round($monnaie, 2),
                'marge_beneficiaire' => round($total_marge, 2),
                'taux_marge_pourcent' => $taux_marge
            ],
            'vente_info' => $vente_info,
            'articles_vendus' => $articles_vendus
        ]
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
