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

// Vérifier l'authentification
$id_session = isset($_SESSION['session_useres']) ? intval($_SESSION['session_useres']) : 0;

if ($id_session <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non connecté']);
    exit;
}

// Récupérer le nouveau taux
$taux = isset($_POST['taux']) ? floatval($_POST['taux']) : 0;

if ($taux <= 0) {
    echo json_encode(['success' => false, 'message' => 'Taux invalide']);
    exit;
}

// Enregistrer le taux dans la session
$_SESSION['taux_usd'] = $taux;

echo json_encode([
    'success' => true,
    'message' => 'Taux mis à jour avec succès',
    'taux' => $taux
]);

$conn->close();
?>
