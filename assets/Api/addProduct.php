<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';



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






// Récupérer l'ID session de l'utilisateur connecté
// Récupérer l'ID session de l'utilisateur connecté
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

// Utilisation d'une structure pour lire les données POST (form-data)
// C'est la méthode standard pour les formulaires HTML
$reference = isset($_POST['reference']) ? trim($_POST['reference']) : '';
$nom_produit = isset($_POST['nom_produit']) ? trim($_POST['nom_produit']) : '';
$categorie = isset($_POST['categorie']) ? trim($_POST['categorie']) : '';

// Convertir les chaînes en nombres (utiliser floatval/intval pour assurer la sécurité)
// NOTE: Le code initial utilisait les variables locales en minuscules : $prix_achat, $prix_vente, $quantite_stock, $quantite_alerte.
// Assurez-vous que les variables utilisées plus bas correspondent à celles-ci.
$prix_achat = isset($_POST['Prix_Achat']) ? floatval($_POST['Prix_Achat']) : 0.00;
$prix_vente = isset($_POST['Prix_Vente']) ? floatval($_POST['Prix_Vente']) : 0.00;
$quantite_alerte = isset($_POST['Seuil_Alerte']) ? intval($_POST['Seuil_Alerte']) : 5;
$quantite_stock = isset($_POST['Stock_Initial']) ? intval($_POST['Stock_Initial']) : 0;

// Les champs date_creation et Stock_Initial du formulaire HTML
// dans le code PHP initial sont référencés différemment.
// Assurez-vous d'utiliser les noms des variables PHP utilisées dans le reste du script:
// prix_achat, prix_vente, quantite_stock (pour Stock_Initial), quantite_alerte (pour Seuil_Alerte).

if ($id_session <= 0) {
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

if (empty($reference) || empty($nom_produit)) {
    echo json_encode(['success' => false, 'message' => 'Référence et nom du produit requis']);
    exit; // Retirer le echo $reference; ici.
}

if ($prix_achat < 0 || $prix_vente < 0 || $quantite_stock < 0) {
    echo json_encode(['success' => false, 'message' => 'Les valeurs ne peuvent pas être négatives']);
    exit;
}

// Vérifier si le produit existe déjà
$checkSql = "SELECT id_produit FROM produit WHERE reference = ? and id_session = $id_session LIMIT 1";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("s", $reference);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Ce produit existe déjà']);
    exit;
}

// Insérer le nouveau produit
$sql = "INSERT INTO produit (id_session, reference, nom_produit, prix_achat, prix_vente, quantite_stock, quantite_alerte, categorie, date_creation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation: ' . $conn->error]);
    exit;
}

// Types: i=int, s=string, d=double
// Ordre: id_session(i), reference(s), nom_produit(s), prix_achat(d), prix_vente(d), quantite_stock(i), quantite_alerte(i), categorie(s)
$stmt->bind_param("issddiis", $id_session, $reference, $nom_produit, $prix_achat, $prix_vente, $quantite_stock, $quantite_alerte, $categorie);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    $id_produit = $stmt->insert_id;
    echo json_encode([
        'success' => true,
        'message' => 'Produit ajouté avec succès',
        'product' => [
            'id_produit' => $id_produit,
            'id_session' => $id_session,
            'reference' => $reference,
            'nom_produit' => $nom_produit,
            'prix_achat' => $prix_achat,
            'prix_vente' => $prix_vente,
            'quantite_stock' => $quantite_stock,
            'quantite_alerte' => $quantite_alerte,
            'categorie' => $categorie
        ]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'ajout du produit']);
}

$stmt->close();
$checkStmt->close();
$conn->close();
