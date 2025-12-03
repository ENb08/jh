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

// Démarrer la session
session_start();

// Fonction d'authentification
function authenticateUser($conn, $username, $password) {
    $sql = "SELECT id_users, users_name, pasword_user, role_users, numero_tele FROM users_jh WHERE users_name = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        // Vérifier le mot de passe (supposant qu'il est hashé en MD5 ou texte brut)
        if (md5($password) === $user['pasword_user'] || $password === $user['pasword_user']) {
            return $user;
        }
    }
    return null;
}

// Fonction pour stocker les données hors ligne (localStorage)
function storeOfflineData($user) {
    return [
        'id_users' => $user['id_users'],
        'users_name' => $user['users_name'],
        'numero_tele' => $user['numero_tele'],
        'role_users' => $user['role_users'],
        'timestamp' => time()
    ];
}

?>