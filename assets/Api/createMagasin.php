<?php

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nom_magasin = $_POST['nom_magasin'] ?? '';
    $adresse_magasin = $_POST['adresse_magasin'] ?? '';
    $telephone_magasin = $_POST['telephone_magasin'] ?? '';
    $email_magasin = $_POST['email_magasin'] ?? '';
    $nom_proprio = $_POST['nom_proprio'] ?? '';
    $users_name = $_POST['users_name'] ?? '';
    $pasword_user = $_POST['pasword_user'] ?? '';

    if (empty($nom_magasin) || empty($users_name) || empty($pasword_user)) {
        echo json_encode(['success' => false, 'message' => 'Champs obligatoires manquants']);
        exit();
    }

    // Créer le magasin
    $sql = "INSERT INTO magasins (nom_magasin, adresse_magasin, telephone_magasin, email_magasin, nom_proprio) 
            VALUES (?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssss", $nom_magasin, $adresse_magasin, $telephone_magasin, $email_magasin, $nom_proprio);
    
    if ($stmt->execute()) {
        $id_magasin = $stmt->insert_id;

        // Créer l'utilisateur admin du magasin
        $role = 'admin';
        $sql2 = "INSERT INTO users_jh (users_name, pasword_user, role_users, id_magasin, numero_tele) 
                 VALUES (?, ?, ?, ?, ?)";
        
        $stmt2 = $conn->prepare($sql2);
        $stmt2->bind_param("sssis", $users_name, $pasword_user, $role, $id_magasin, $telephone_magasin);
        
        if ($stmt2->execute()) {
            echo json_encode(['success' => true, 'message' => 'Magasin créé avec succès']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Erreur création utilisateur']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Erreur création magasin']);
    }
}
?>