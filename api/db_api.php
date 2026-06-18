<?php
/**
 * api/db_api.php — API REST pour pitwallg2_capteurs
 * Endpoints: ?action=sensors|buzzer|buzzer_status|leds|led|tables
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../config.php';
$action = $_GET['action'] ?? '';

try {
  switch ($action) {

    case 'sensors':
      $groupe = $_GET['groupe'] ?? null;
      if ($groupe) {
        $stmt = $bdd->prepare("SELECT * FROM mesure WHERE groupe = :groupe ORDER BY date_mesure DESC LIMIT 50");
        $stmt->execute(['groupe' => $groupe]);
      } else {
        $stmt = $bdd->query("SELECT m.* FROM mesure m INNER JOIN (SELECT groupe, MAX(date_mesure) AS max_date FROM mesure GROUP BY groupe) latest ON m.groupe = latest.groupe AND m.date_mesure = latest.max_date ORDER BY m.groupe");
      }
      $data = $stmt->fetchAll();
      echo json_encode(['success' => true, 'data' => $data, 'count' => count($data)]);
      break;

    case 'sensor_history':
      $groupe = $_GET['groupe'] ?? null;
      $type = $_GET['type'] ?? 'temperature';
      $limit = min(200, intval($_GET['limit'] ?? 50));
      if (!$groupe) { echo json_encode(['success' => false, 'error' => 'groupe requis']); break; }
      $allowed = ['temperature', 'humidite', 'luminosite'];
      if (!in_array($type, $allowed)) $type = 'temperature';
      $stmt = $bdd->prepare("SELECT date_mesure, $type AS valeur FROM mesure WHERE groupe = :groupe AND $type IS NOT NULL ORDER BY date_mesure DESC LIMIT $limit");
      $stmt->execute(['groupe' => $groupe]);
      echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
      break;

    case 'buzzer':
      $cmd = strtoupper($_GET['cmd'] ?? $_POST['cmd'] ?? '');
      $valid = ['BUZZER_PIT_STOP','BUZZER_SAFETY_CAR','BUZZER_RELEASE','BUZZER_HOLD','BUZZER_EMERGENCY','BUZZER_TEST','BUZZER_OFF'];
      if (!in_array($cmd, $valid)) {
        echo json_encode(['success' => false, 'error' => 'Commande invalide. OK: '.implode(', ',$valid)]);
        break;
      }
      $stmt = $bdd->prepare("INSERT INTO commande_buzzer_g2e (commande, date_envoi) VALUES (:cmd, NOW())");
      $stmt->execute(['cmd' => $cmd]);
      echo json_encode(['success' => true, 'message' => "Commande $cmd envoyée", 'commande' => $cmd, 'id' => $bdd->lastInsertId()]);
      break;

    case 'buzzer_status':
      $stmt = $bdd->query("SELECT * FROM commande_buzzer_g2e ORDER BY date_envoi DESC LIMIT 1");
      echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
      break;

    case 'leds':
      $tables = $bdd->query("SHOW TABLES LIKE '%led%'")->fetchAll(PDO::FETCH_COLUMN);
      $all = [];
      foreach ($tables as $t) {
        $s = $bdd->query("SELECT * FROM `$t` ORDER BY id DESC LIMIT 1")->fetch();
        if ($s) $all[$t] = $s;
      }
      echo json_encode(['success' => true, 'data' => $all, 'tables' => $tables]);
      break;

    case 'led':
      $groupe = $_GET['groupe'] ?? $_POST['groupe'] ?? '';
      $etat = $_GET['state'] ?? $_POST['state'] ?? '';
      if (!$groupe || !in_array($etat, ['0','1'])) {
        echo json_encode(['success' => false, 'error' => 'groupe et state (0/1) requis']);
        break;
      }
      $tables = $bdd->query("SHOW TABLES LIKE '%led%'")->fetchAll(PDO::FETCH_COLUMN);
      if (empty($tables)) { echo json_encode(['success' => false, 'error' => 'Aucune table LED']); break; }
      $table = $tables[0];
      $stmt = $bdd->prepare("INSERT INTO `$table` (groupe, etat, date_modification) VALUES (:groupe, :etat, NOW())");
      $stmt->execute(['groupe' => $groupe, 'etat' => intval($etat)]);
      echo json_encode(['success' => true, 'message' => "LED $groupe -> ".($etat=='1'?'ON':'OFF'), 'groupe' => $groupe, 'etat' => intval($etat)]);
      break;

    case 'tables':
      $tables = $bdd->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
      $result = [];
      foreach ($tables as $t) {
        $cnt = $bdd->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        $cols = $bdd->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN);
        $result[$t] = ['rows' => intval($cnt), 'columns' => $cols];
      }
      echo json_encode(['success' => true, 'data' => $result]);
      break;

    default:
      echo json_encode(['success' => true, 'message' => 'API pitwallg2', 'endpoints' => ['?action=sensors','?action=sensor_history&groupe=X&type=temperature','?action=buzzer&cmd=BUZZER_PIT_STOP','?action=buzzer_status','?action=leds','?action=led&groupe=X&state=1','?action=tables']]);
  }
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'DB: '.$e->getMessage()]);
}
