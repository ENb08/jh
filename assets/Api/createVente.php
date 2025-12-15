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

// Récupérer les données POST
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['items']) || !is_array($input['items']) || empty($input['items'])) {
    echo json_encode(['success' => false, 'message' => 'Données de vente invalides']);
    exit;
}

$items = $input['items'];
$mode_paiement = isset($input['payment_mode']) ? $input['payment_mode'] : 'cash';
$devise = isset($input['currency']) ? $input['currency'] : 'CDF';
$remise_pourcent = isset($input['discount']) ? floatval($input['discount']) : 0;
$montant_recu = isset($input['amount_received']) ? floatval($input['amount_received']) : 0;
$taux_usd = isset($_SESSION['taux_usd']) ? floatval($_SESSION['taux_usd']) : 2400;

// Démarrer une transaction
$conn->begin_transaction();

try {
    // Calculer les totaux
    $sous_total = 0;
    foreach ($items as $item) {
        $prix = $devise === 'CDF' ? floatval($item['price_cdf']) : floatval($item['price_usd']);
        $qty = intval($item['qty']);
        $sous_total += $prix * $qty;
    }

    // Appliquer la remise
    $montant_remise = 0;
    if ($remise_pourcent > 0) {
        $montant_remise = $sous_total * ($remise_pourcent / 100);
        $sous_total -= $montant_remise;
    }

    // Calculer la TVA (10%)
    $montant_tva = $sous_total * 0.10;
    $total = $sous_total + $montant_tva;

    // Convertir en CDF si nécessaire
    $total_cdf = $devise === 'USD' ? $total * $taux_usd : $total;
    $montant_recu_cdf = $devise === 'USD' ? $montant_recu * $taux_usd : $montant_recu;
    $monnaie = $montant_recu_cdf - $total_cdf;

    // Insérer la vente principale
    $sqlVente = "INSERT INTO ventes (
        id_session,
        date_vente,
        mode_paiement,
        devise,
        sous_total,
        remise_pourcent,
        montant_remise,
        montant_tva,
        total,
        montant_recu,
        monnaie,
        taux_usd,
        statut
    ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completee')";

    $stmtVente = $conn->prepare($sqlVente);
    if (!$stmtVente) {
        throw new Exception('Erreur préparation vente: ' . $conn->error);
    }

    $stmtVente->bind_param(
        "issdddddddds",
        $id_session,
        $mode_paiement,
        $devise,
        $sous_total,
        $remise_pourcent,
        $montant_remise,
        $montant_tva,
        $total,
        $montant_recu,
        $monnaie,
        $taux_usd,
        $statut = 'completee'
    );

    if (!$stmtVente->execute()) {
        throw new Exception('Erreur insertion vente: ' . $stmtVente->error);
    }

    $id_vente = $conn->insert_id;
    $stmtVente->close();

    // Insérer les lignes de vente et mettre à jour le stock magasin
    $sqlLigne = "INSERT INTO vente_lignes (
        id_vente,
        id_produit,
        quantite,
        prix_unitaire_cdf,
        prix_unitaire_usd,
        total_ligne
    ) VALUES (?, ?, ?, ?, ?, ?)";

    $stmtLigne = $conn->prepare($sqlLigne);
    if (!$stmtLigne) {
        throw new Exception('Erreur préparation ligne: ' . $conn->error);
    }

    $sqlUpdateStock = "UPDATE magasin_stock
                       SET quantite_magasin = quantite_magasin - ?
                       WHERE id_produit = ? AND id_session = ?";

    $stmtUpdateStock = $conn->prepare($sqlUpdateStock);
    if (!$stmtUpdateStock) {
        throw new Exception('Erreur préparation update stock: ' . $conn->error);
    }

    foreach ($items as $item) {
        $id_produit = intval($item['id']);
        $qty = intval($item['qty']);
        $prix_cdf = floatval($item['price_cdf']);
        $prix_usd = floatval($item['price_usd']);
        $prix_ligne = $devise === 'CDF' ? $prix_cdf : $prix_usd;
        $total_ligne = $prix_ligne * $qty;

        // Vérifier le stock disponible
        $sqlCheck = "SELECT quantite_magasin FROM magasin_stock WHERE id_produit = ? AND id_session = ?";
        $stmtCheck = $conn->prepare($sqlCheck);
        $stmtCheck->bind_param("ii", $id_produit, $id_session);
        $stmtCheck->execute();
        $resultCheck = $stmtCheck->get_result();
        $rowCheck = $resultCheck->fetch_assoc();
        $stmtCheck->close();

        if (!$rowCheck || $rowCheck['quantite_magasin'] < $qty) {
            throw new Exception("Stock insuffisant pour le produit ID: $id_produit");
        }

        // Insérer la ligne de vente
        $stmtLigne->bind_param(
            "iiiddd",
            $id_vente,
            $id_produit,
            $qty,
            $prix_cdf,
            $prix_usd,
            $total_ligne
        );

        if (!$stmtLigne->execute()) {
            throw new Exception('Erreur insertion ligne: ' . $stmtLigne->error);
        }

        // Mettre à jour le stock magasin
        $stmtUpdateStock->bind_param("iii", $qty, $id_produit, $id_session);

        if (!$stmtUpdateStock->execute()) {
            throw new Exception('Erreur mise à jour stock: ' . $stmtUpdateStock->error);
        }
    }

    $stmtLigne->close();
    $stmtUpdateStock->close();

    // Valider la transaction
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Vente enregistrée avec succès',
        'id_vente' => $id_vente,
        'total' => $total,
        'devise' => $devise
    ]);

} catch (Exception $e) {
    // Annuler la transaction en cas d'erreur
    $conn->rollback();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
