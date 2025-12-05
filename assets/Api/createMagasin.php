<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

// Récupérer et valider les données
$nom_magasin = trim($_POST['nomMagasin'] ?? '');
$adresse_magasin = trim($_POST['adresseMagasin'] ?? '');
$telephone_magasin = trim($_POST['telephoneMagasin'] ?? '');
$email_magasin = trim($_POST['emailMagasin'] ?? '');
$nom_proprio = trim($_POST['nomProprio'] ?? '');
$users_name = trim($_POST['usernameMagasin'] ?? '');
$pasword_user = trim($_POST['passwordMagasin'] ?? '');

// Validation des champs vides
$fieldsRequired = [
    'nom_magasin' => 'Nom du magasin',
    'adresse_magasin' => 'Adresse',
    'telephone_magasin' => 'Téléphone du magasin',
    'email_magasin' => 'Email',
    'nom_proprio' => 'Nom du propriétaire',
    'users_name' => "Nom d'utilisateur",
    'pasword_user' => 'Mot de passe'
];

$missingFields = [];
foreach ($fieldsRequired as $field => $label) {
    if (empty($$field)) {
        $missingFields[] = $label;
    }
}

if (!empty($missingFields)) {
    echo json_encode([
        'success' => false,
        'message' => 'Champs obligatoires manquants: ' . implode(', ', $missingFields),
        'errors' => $missingFields
    ]);
    exit;
}

// Validation du format email
if (!filter_var($email_magasin, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Format email invalide']);
    exit;
}

// Validation du téléphone (au moins 8 caractères)
if (strlen($telephone_magasin) < 8) {
    echo json_encode(['success' => false, 'message' => 'Le téléphone doit contenir au moins 8 caractères']);
    exit;
}

// Vérifier que le username n'existe pas déjà
$checkUsername = "SELECT id_users FROM users_jh WHERE users_name = ? LIMIT 1";
$stmtCheck = $conn->prepare($checkUsername);
$stmtCheck->bind_param("s", $users_name);
$stmtCheck->execute();
$resultCheck = $stmtCheck->get_result();

if ($resultCheck->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => "Ce nom d'utilisateur existe déjà"]);
    $stmtCheck->close();
    exit;
}
$stmtCheck->close();

// Hasher le mot de passe
$pasword_hashed = md5($pasword_user);

// Démarrer une transaction
$conn->begin_transaction();

try {
    // Créer le magasin
    $sql = "INSERT INTO magasins (nom_magasin, adresse_magasin, telephone_magasin, email_magasin, nom_proprio, date_creation) 
            VALUES (?, ?, ?, ?, ?, NOW())";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Erreur préparation requête magasin: ' . $conn->error);
    }

    $stmt->bind_param("sssss", $nom_magasin, $adresse_magasin, $telephone_magasin, $email_magasin, $nom_proprio);
    
    if (!$stmt->execute()) {
        throw new Exception('Erreur création magasin: ' . $stmt->error);
    }

    $id_magasin = $stmt->insert_id;
    $stmt->close();

    // Créer l'utilisateur admin du magasin
    $role_users = 1;
    $sql2 = "INSERT INTO users_jh (users_name, pasword_user, role_users, id_magasin, numero_tele, date_creation) 
             VALUES (?, ?, ?, ?, ?, NOW())";
    
    $stmt2 = $conn->prepare($sql2);
    if (!$stmt2) {
        throw new Exception('Erreur préparation requête utilisateur: ' . $conn->error);
    }

    $stmt2->bind_param("sssis", $users_name, $pasword_hashed, $role_users, $id_magasin, $telephone_magasin);
    
    if (!$stmt2->execute()) {
        throw new Exception('Erreur création utilisateur: ' . $stmt2->error);
    }

    $id_users = $stmt2->insert_id;
    $stmt2->close();

    // Valider la transaction
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Magasin et utilisateur créés avec succès',
        'data' => [
            'id_magasin' => $id_magasin,
            'id_users' => $id_users,
            'nom_magasin' => $nom_magasin,
            'users_name' => $users_name
        ]
    ]);

} catch (Exception $e) {
    // Annuler la transaction en cas d'erreur
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>