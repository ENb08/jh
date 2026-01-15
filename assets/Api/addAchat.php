<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// --- GESTION DES ERREURS DE CONNEXION ET DE MÉTHODE ---

if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur: connexion BD non disponible']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// --- RÉCUPÉRATION ET VALIDATION DES DONNÉES ---

// Récupérer l'ID session de l'utilisateur connecté
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

// Récupérer les données JSON
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

// Si pas de JSON, essayer form-data
if (!$data) {
    $data = $_POST;
}

// Extraire les données
$fournisseur = isset($data['fournisseur']) ? trim($data['fournisseur']) : '';
$category = isset($data['category']) ? trim($data['category']) : '';
$invoice_no = isset($data['invoice_no']) ? trim($data['invoice_no']) : '';
$purchase_date = isset($data['purchase_date']) ? trim($data['purchase_date']) : date('Y-m-d');
$montant_total = isset($data['montant_total']) ? floatval($data['montant_total']) : 0;
$devise = isset($data['devise']) ? trim($data['devise']) : 'CDF';
$payment_status = isset($data['payment_status']) ? trim($data['payment_status']) : 'pending';
$notes = isset($data['notes']) ? trim($data['notes']) : '';

// Vérifications
if ($id_session <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

if (empty($fournisseur)) {
    echo json_encode(['success' => false, 'message' => 'Le nom du fournisseur est obligatoire']);
    exit;
}

if ($montant_total <= 0) {
    echo json_encode(['success' => false, 'message' => 'Le montant doit être supérieur à 0']);
    exit;
}

// Mapper le statut de paiement
$statut_map = [
    'paid' => 'payee',
    'pending' => 'en_attente',
    'partial' => 'partiellement_payee'
];
$statut = isset($statut_map[$payment_status]) ? $statut_map[$payment_status] : 'en_attente';

// Récupérer id_magasin de la session
$id_magasin = isset($_SESSION['id_magasin']) ? intval($_SESSION['id_magasin']) : 1;

// --- TRAITEMENT BD ---

try {
    // Vérifier/Créer les colonnes nécessaires dans mouvements_tresorerie
    $col_check = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'fournisseur'");
    if ($col_check && $col_check->num_rows == 0) {
        $conn->query("ALTER TABLE mouvements_tresorerie ADD COLUMN fournisseur VARCHAR(100) DEFAULT NULL AFTER categorie");
    }
    
    $col_check = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'numero_facture'");
    if ($col_check && $col_check->num_rows == 0) {
        $conn->query("ALTER TABLE mouvements_tresorerie ADD COLUMN numero_facture VARCHAR(50) DEFAULT NULL AFTER fournisseur");
    }
    
    $col_check = $conn->query("SHOW COLUMNS FROM mouvements_tresorerie LIKE 'statut'");
    if ($col_check && $col_check->num_rows == 0) {
        $conn->query("ALTER TABLE mouvements_tresorerie ADD COLUMN statut VARCHAR(30) DEFAULT 'payee' AFTER numero_facture");
    }
    
    // Insérer l'achat dans mouvements_tresorerie
    $insertSQL = "INSERT INTO mouvements_tresorerie 
                  (id_magasin, user_id, type_mouvement, montant, devise, description, categorie, fournisseur, numero_facture, statut, reference, date_mouvement)
                  VALUES (?, ?, 'achat', ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($insertSQL);
    
    if (!$stmt) {
        throw new Exception('Erreur de préparation: ' . $conn->error);
    }
    
    // Préparer la description
    $description = !empty($notes) ? $notes : '';
    
    // Formater la date
    $date_mouvement = !empty($purchase_date) ? $purchase_date . ' ' . date('H:i:s') : date('Y-m-d H:i:s');
    
    // Référence = numéro facture
    $reference = $invoice_no;
    
    $stmt->bind_param("iidssssssss", 
        $id_magasin,
        $id_session, 
        $montant_total, 
        $devise, 
        $description, 
        $category,
        $fournisseur,
        $invoice_no,
        $statut,
        $reference,
        $date_mouvement
    );
    
    if (!$stmt->execute()) {
        throw new Exception('Erreur d\'exécution: ' . $stmt->error);
    }
    
    $id_mouvement = $conn->insert_id;
    $stmt->close();
    
    // Retourner le succès
    echo json_encode([
        'success' => true,
        'message' => 'Achat enregistré avec succès',
        'id' => $id_mouvement
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur: ' . $e->getMessage()
    ]);
}
?>
