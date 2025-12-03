<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// Vérifier que la requête est POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Récupérer les données
$data = json_decode(file_get_contents("php://input"), true);
$username = isset($data['username']) ? trim($data['username']) : '';
$password = isset($data['password']) ? $data['password'] : '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Identifiants manquants']);
    exit;
}

// Vérifier la connexion à la base de données
if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données']);
    exit;
}

// Requête pour authentifier l'utilisateur
$sql = "SELECT id_users, users_name, pasword_user, role_users, numero_tele FROM users_jh WHERE users_name = ?  and role_users='1'LIMIT 1";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erreur de préparation de la requête']);
    exit;
}

$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    
    // Vérifier le mot de passe (MD5 ou texte brut)
    $passwordMatch = (md5($password) === $user['pasword_user']) || ($password === $user['pasword_user']);
    
    if ($passwordMatch) {
        // Créer la session avec le numéro de téléphone
        $_SESSION['session_useres'] = $user['numero_tele'];
        $_SESSION['id_users'] = $user['id_users'];
        $_SESSION['users_name'] = $user['users_name'];
        $_SESSION['role_users'] = $user['role_users'];
        $_SESSION['login_time'] = time();
        $_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];
        
        // Préparer les données hors ligne
        $offlineData = [
            'id_users' => $user['id_users'],
            'users_name' => $user['users_name'],
            'numero_tele' => $user['numero_tele'],
            'role_users' => $user['role_users'],
            'timestamp' => time()
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'Connexion réussie',
            'user' => [
                'id_users' => $user['id_users'],
                'users_name' => $user['users_name'],
                'numero_tele' => $user['numero_tele'],
                'role_users' => $user['role_users']
            ],
            'offline' => $offlineData
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Mot de passe incorrect'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Utilisateur non trouvé'
    ]);
}

$stmt->close();
$conn->close();
?>