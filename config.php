<?php
// config.php - Configuration de la base de données

$db_host = 'mysql-pitwallg2.alwaysdata.net';
$db_user = 'pitwallg2';
$db_password = 'Isepeleve';
$db_name = 'pitwallg2_capteurs';

try {
    $bdd = new PDO(
        'mysql:host=' . $db_host . ';dbname=' . $db_name . ';charset=utf8mb4',
        $db_user,
        $db_password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5
        ]
    );
} catch (PDOException $e) {
    die('Erreur de connexion : ' . $e->getMessage());
}
?>