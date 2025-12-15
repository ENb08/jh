<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// Récupérer le taux depuis la session ou utiliser le taux par défaut
$taux = isset($_SESSION['taux_usd']) ? floatval($_SESSION['taux_usd']) : 2400;

echo json_encode([
    'success' => true,
    'taux' => $taux
]);
?>
