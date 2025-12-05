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
    http_response_code(500);
    die(json_encode([
        'success' => false,
        'message' => 'Erreur de connexion base de données: ' . $conn->connect_error
    ]));
}

// Définit l'encodage UTF-8
$conn->set_charset("utf8mb4");

?>