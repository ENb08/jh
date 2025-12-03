<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if (isset($_SESSION['session_useres'])) {
    echo json_encode([
        'logged_in' => true,
        'numero_tele' => $_SESSION['session_useres'],
        'id_users' => $_SESSION['id_users'],
        'users_name' => $_SESSION['users_name'],
        'role_users' => $_SESSION['role_users']
    ]);
} else {
    echo json_encode(['logged_in' => false]);
}
?>