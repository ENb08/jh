<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$username = isset($data['username']) ? trim($data['username']) : '';
$password = isset($data['password']) ? trim($data['password']) : '';

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Identifiants manquants']);
    exit;
}

$sql = "SELECT id_users, users_name, pasword_user, role_users, numero_tele FROM users_jh WHERE users_name = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();

    $passwordMatch = (md5($password) === $user['pasword_user']) || ($password === $user['pasword_user']);

    if ($passwordMatch) {
        $_SESSION['id_users'] = $user['id_users'];
        $_SESSION['users_name'] = $user['users_name'];
        $_SESSION['role_users'] = $user['role_users'];
        $_SESSION['numero_tele'] = $user['numero_tele'];
        $_SESSION['login_time'] = time();

        echo json_encode([
            'success' => true,
            'message' => 'Connexion réussie',
            'user' => [
                'id_users' => $user['id_users'],
                'users_name' => $user['users_name'],
                'role_users' => $user['role_users']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Mot de passe incorrect']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
}

$stmt->close();
$conn->close();
?>