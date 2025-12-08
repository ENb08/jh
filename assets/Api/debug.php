<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// Afficher toutes les données reçues
$output = [
    'post' => $_POST,
    'get' => $_GET,
    'content_type' => isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'non défini',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'raw_input' => file_get_contents("php://input"),
    'session' => $_SESSION
];

echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
