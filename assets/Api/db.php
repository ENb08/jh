<?php
/**
 * Connexion à la Base de Données XAMPP
 */

// Configuration de la base de données
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "etsjhcom_jh_bd";

// Crée la connexion
$conn = new mysqli($servername, $username, $password, $dbname);

// Vérifie la connexion
if ($conn->connect_error) {
    
    // Ajoutez le Content-Type: application/json ICI
    header('Content-Type: application/json; charset=utf-8'); 
    http_response_code(500);
    
    // On utilise echo + exit() plutôt que die()
    echo json_encode([
        'success' => false,
        'message' => 'Erreur de connexion base de données: ' . $conn->connect_error
    ]);
    exit; // Utiliser exit() est plus clair qu'un die() pour une API
}

// Définit l'encodage UTF-8
$conn->set_charset("utf8mb4");

// NOTE IMPORTANTE : Pas de balise de fermeture 
?> 