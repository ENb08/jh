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
    die(json_encode([
        'success' => false,
        'message' => 'Erreur de connexion : ' . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");


?>