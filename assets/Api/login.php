<?php
header('Content-Type: application/json; charset=utf-8');

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Charger la base de données
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

$username = '';
$password = '';
$id_magasin = null; 

// --- LECTURE DES DONNÉES ENVOYÉES ---
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (strpos($contentType, 'application/json') !== false) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $username = isset($data['username']) ? trim($data['username']) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    $id_magasin = isset($data['id_magasin']) ? $data['id_magasin'] : null;
} else {
    // Lecture POST de secours
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $id_magasin = isset($_POST['id_magasin']) ? $_POST['id_magasin'] : null;
}

// --- VÉRIFICATION DES CHAMPS REQUIS ---
if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Identifiants (username ou password) manquants']);
    exit;
}

if (empty($id_magasin)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Veuillez sélectionner un magasin']);
    exit;
}

// --- REQUÊTE UNIFIÉE (supprime role_users de la clause WHERE) ---
// La requête cherche l'utilisateur UNIVERSELLEMENT par son nom.
$sql = "SELECT `users_name`, `password_users`, `role_users`, `id_magasin`, `id_users`, `numero_tele` FROM `users_jh` WHERE users_name = ? LIMIT 1";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur préparation requête: ' . $conn->error]);
    exit;
}

$stmt->bind_param("s", $username);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur exécution: ' . $stmt->error]);
    exit;
}

$result = $stmt->get_result();
$stmt->close(); // Fermez le statement immédiatement pour libérer les ressources

// --- VÉRIFICATION UNIFIÉE ---
if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    // 1. Vérification du mot de passe
    $passwordMatch = (md5($password) === $user['password_users']) || ($password === $user['password_users']);

    if ($passwordMatch) {
        
        // 2. VÉRIFICATION DU MAGASIN (si l'utilisateur a un magasin attribué)
        if ($user['id_magasin'] !== null && $user['id_magasin'] != $id_magasin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Ce compte n\'est pas autorisé pour ce magasin.']);
            exit;
        }

        // --- GESTION DES SESSIONS ET REDIRECTIONS ---
        $_SESSION['session_useres'] = $user['numero_tele'];
        $_SESSION['id_users'] = $user['id_users'];
        $_SESSION['users_name'] = $user['users_name'];
        $_SESSION['role_users'] = $user['role_users'];
        $_SESSION['id_magasin'] = $id_magasin; 
        $_SESSION['login_time'] = time();
        $_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];
        
        // Définir l'URL de redirection basée sur la valeur réelle du rôle_users dans la BDD
        if ($user['role_users'] == 1 || $user['role_users'] === 'admin') {
            $redirectUrl = 'acceuil.html'; // Admin
        } elseif ($user['role_users'] == 2 || $user['role_users'] === 'caisse') {
            $redirectUrl = 'caisse.html'; // Caissier (POS)
        } else {
             $redirectUrl = 'acceuil.html'; // Rôle par défaut si non spécifié
        }

        $offlineData = [
            'id_users' => $user['id_users'],
            'users_name' => $user['users_name'],
            'numero_tele' => $user['numero_tele'],
            'role_users' => $user['role_users'],
            'timestamp' => time()
        ];
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Connexion réussie',
            'redirect' => $redirectUrl,
            'user' => $user, // Envoyer toutes les données utilisateur si nécessaire
            'offline' => $offlineData
        ]);
        
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Mot de passe incorrect']);
    }
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
}

$conn->close();
?>