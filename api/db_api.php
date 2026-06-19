<?php
error_reporting(0);
ini_set('display_errors', '0');

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
      $data = [];
      $stmt = $bdd->query('SELECT groupe, MAX(CASE WHEN type=\'temperature\' THEN valeur END) AS temperature, MAX(CASE WHEN type=\'humidite\' THEN valeur END) AS humidite, MAX(date) AS derniere_mesure, COUNT(*) AS nb_mesures FROM Mesure GROUP BY groupe ORDER BY groupe');
      foreach ($stmt->fetchAll() as $row) { $data[$row['groupe']] = $row; }
      $g2b = $bdd->query('SELECT * FROM G2B ORDER BY date DESC LIMIT 1')->fetch();
      if ($g2b) { $data['g2b'] = ['groupe'=>'g2b','temperature'=>floatval($g2b['temperature']),'humidite'=>floatval($g2b['humidite']),'derniere_mesure'=>$g2b['date'],'nb_mesures'=>0,'source'=>'G2B']; }
      echo json_encode(['success'=>true,'data'=>array_values($data),'count'=>count($data)]);
      break;
    case 'sensor_history':
      $groupe = $_GET['groupe'] ?? ''; $type = $_GET['type'] ?? 'temperature'; $limit = min(200,intval($_GET['limit']??50));
      if (!$groupe) { echo json_encode(['success'=>false,'error'=>'groupe requis']); break; }
      if ($groupe==='g2b') { $stmt = $bdd->prepare("SELECT date, $type AS valeur FROM G2B WHERE $type IS NOT NULL ORDER BY date DESC LIMIT $limit"); $stmt->execute(); }
      else { $stmt = $bdd->prepare('SELECT date, valeur FROM Mesure WHERE groupe=:groupe AND type=:type ORDER BY date DESC LIMIT '.$limit); $stmt->execute(['groupe'=>$groupe,'type'=>$type]); }
      echo json_encode(['success'=>true,'data'=>$stmt->fetchAll()]);
      break;
    case 'buzzer':
      $cmd = strtoupper($_GET['cmd'] ?? $_POST['cmd'] ?? '');
      $valid = ['BUZZER_PIT_STOP','BUZZER_SAFETY_CAR','BUZZER_RELEASE','BUZZER_HOLD','BUZZER_EMERGENCY','BUZZER_TEST','BUZZER_OFF'];
      if (!in_array($cmd,$valid)) { echo json_encode(['success'=>false,'error'=>'Invalide']); break; }
      $source = $_GET['source']??$_POST['source']??'dashboard';
      $stmt = $bdd->prepare('INSERT INTO commande_buzzer_g2e (commande,statut,groupe_source,created_at) VALUES (:cmd,\'pending\',:source,NOW())');
      $stmt->execute(['cmd'=>$cmd,'source'=>$source]);
      echo json_encode(['success'=>true,'message'=>"Commande $cmd envoyée",'commande'=>$cmd,'id'=>$bdd->lastInsertId()]);
      break;
    case 'buzzer_status':
      $cmds = $bdd->query('SELECT * FROM commande_buzzer_g2e ORDER BY created_at DESC LIMIT 10')->fetchAll();
      $state = $bdd->query('SELECT * FROM buzzer_g2e ORDER BY updated_at DESC LIMIT 1')->fetch();
      echo json_encode(['success'=>true,'commands'=>$cmds,'state'=>$state]);
      break;
    case 'leds':
      $s = $bdd->query('SELECT * FROM leds_g2c ORDER BY id DESC LIMIT 1')->fetch();
      echo json_encode(['success'=>true,'data'=>$s ? ['leds_g2c'=>$s] : []]);
      break;
    case 'led':
      $etat = intval($_GET['state']??$_POST['state']??'0');
      if (!in_array($etat,[0,1])) { echo json_encode(['success'=>false,'error'=>'state 0/1 requis']); break; }
      $stmt = $bdd->prepare('INSERT INTO leds_g2c (etat,updated_at) VALUES (:etat,NOW())');
      $stmt->execute(['etat'=>$etat]);
      echo json_encode(['success'=>true,'message'=>'LED g2c '.($etat?'ON':'OFF'),'etat'=>$etat,'id'=>$bdd->lastInsertId()]);
      break;
    case 'lidar_g2d':
      $limit = min(200, intval($_GET['limit'] ?? 50));
      $stmt = $bdd->query("SELECT * FROM G2D_LIDAR ORDER BY date_mesure DESC LIMIT $limit");
      echo json_encode(['success'=>true,'data'=>$stmt->fetchAll(),'count'=>$stmt->rowCount()]);
      break;
    case 'faq':
      $q = trim($_GET['q']??$_POST['q']??'');
      if (!$q) { echo json_encode(['success'=>true,'data'=>$bdd->query("SELECT * FROM faq_g2b WHERE status='approved' ORDER BY id")->fetchAll()]); break; }
      $stmt = $bdd->prepare("SELECT * FROM faq_g2b WHERE status='approved' AND (question LIKE :q OR answer LIKE :q2) LIMIT 5");
      $stmt->execute(['q'=>"%$q%",'q2'=>"%$q%"]);
      echo json_encode(['success'=>true,'data'=>$stmt->fetchAll(),'query'=>$q]);
      break;
    case 'tables':
      $tables = $bdd->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN); $result = [];
      foreach ($tables as $t) { $cnt = $bdd->query("SELECT COUNT(*) FROM `$t`")->fetchColumn(); $cols = $bdd->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN); $result[$t] = ['rows'=>intval($cnt),'columns'=>$cols]; }
      echo json_encode(['success'=>true,'data'=>$result]);
      break;
    default:
      echo json_encode(['success'=>true,'message'=>'API v2','endpoints'=>['sensors','sensor_history','buzzer','buzzer_status','leds','led','faq','tables']]);
  }
} catch (PDOException $e) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'DB: '.$e->getMessage()]); }
