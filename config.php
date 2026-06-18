<?php
// config.php - Configuration base de données + chargement .env

// Charge les variables depuis .env.local (ou .env) si le fichier existe
function loadEnv(string $dir): void {
    $files = [$dir . '/.env.local', $dir . '/.env'];
    foreach ($files as $file) {
        if (!file_exists($file)) continue;
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;
            if (str_contains($line, '=')) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                if (!getenv($key)) putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}
loadEnv(__DIR__);

$db_host = getenv('DB_HOST') ?: 'mysql-pitwallg2.alwaysdata.net';
$db_user = getenv('DB_USER') ?: 'pitwallg2';
$db_password = getenv('DB_PASSWORD') ?: 'Isepeleve';
$db_name = getenv('DB_NAME') ?: 'pitwallg2_capteurs';

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