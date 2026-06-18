<?php
/**
 * api/chat_ai.php — IA Ferrari F1 ultra-puissante
 * Primaire: Groq (ultra-rapide, llama-3.3-70b)
 * Fallback: Mistral (deep reasoning)
 * Fallback: FAQ BDD locale
 */
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'POST only']); exit; }

require_once __DIR__ . '/../config.php';

$GROQ_KEY = getenv('GROQ_API_KEY') ?: '';
$MISTRAL_KEY = getenv('MISTRAL_API_KEY') ?: '';

$body = json_decode(file_get_contents('php://input'), true);
$message = trim($body['message'] ?? '');
$history = $body['history'] ?? [];

if (!$message) { echo json_encode(['error'=>'message required']); exit; }

// Contexte temps réel depuis la BDD
$context = '';
try {
    $s = $bdd->query("SELECT groupe, MAX(CASE WHEN type='temperature' THEN valeur END) AS t, MAX(CASE WHEN type='humidite' THEN valeur END) AS h FROM Mesure GROUP BY groupe")->fetchAll();
    $g2b = $bdd->query("SELECT temperature, humidite FROM G2B ORDER BY date DESC LIMIT 1")->fetch();
    $lidar = $bdd->query("SELECT luminosite, distance_mm, reflectivite, status FROM G2D_LIDAR ORDER BY date_mesure DESC LIMIT 1")->fetch();
    $buzzer = $bdd->query("SELECT commande, created_at FROM commande_buzzer_g2e ORDER BY created_at DESC LIMIT 1")->fetch();
    $led = $bdd->query("SELECT etat FROM leds_g2c ORDER BY id DESC LIMIT 1")->fetch();
    $context = "DONNÉES LIVE:\n";
    foreach ($s as $r) $context .= "- {$r['groupe']}: {$r['t']}°C / {$r['h']}%\n";
    if ($g2b) $context .= "- g2b: {$g2b['temperature']}°C / {$g2b['humidite']}%\n";
    if ($lidar) $context .= "- LIDAR G2D: {$lidar['luminosite']} lux, {$lidar['distance_mm']}mm, refl {$lidar['reflectivite']}%, status {$lidar['status']}\n";
    if ($buzzer) $context .= "- Dernier buzzer: {$buzzer['commande']} ({$buzzer['created_at']})\n";
    if ($led) $context .= "- LED g2c: ".($led['etat']?'ON':'OFF')."\n";
} catch (Exception $e) { $context = ''; }

$system = "Tu es l'Ingénieur de Piste en Chef de la Scuderia Ferrari HP — SF-26.

Tu travailles au mur des stands (pit wall) de Maranello. Tu analyses la télémétrie,
les données LiDAR, la stratégie de course et les performances de la monoplace.

Ton expertise couvre:
- Aérodynamique F1: effet de sol, downforce, drag, rake, balance
- LiDAR ride height: garde au sol mesurée à 100 Hz, résolution 0.1mm
- Groupe propulseur: V6 turbo hybride 1.6L, MGU-K, MGU-H, batterie 800V
- Stratégie course: dégradation pneus, fenêtres d'arrêt, undercut/overcut
- Setup: suspension, rake, wing levels, differential
- Télémétrie CAN bus: RPM, vitesse, rapports, DRS, températures
- Circuits F1: Monza, Monaco, Spa, caractéristiques techniques
- Histoire Ferrari: Enzo Ferrari, Schumacher, Lauda, Villeneuve
- Capteurs IoT G2D: luminosité 0-2150 lux, distance, réflectivité
- Actionneurs: buzzer G2E (PIT_STOP, SAFETY_CAR, EMERGENCY...), LEDs

Ton style:
- Italien passionné mais techniquement précis 🇮🇹
- Utilise 'Forza Ferrari!' ou 'Andiamo!' quand c'est approprié
- Réponds en français avec des termes techniques F1 exacts
- Sois concis (3-5 phrases) sauf si on demande un détail technique
- Si on te demande les données live, cite les vraies valeurs du contexte
- Tu peux tutoyer le pilote (Charles) et les ingénieurs

$context";

$messages = [['role'=>'system','content'=>$system]];
foreach (array_slice($history, -8) as $h) {
    $messages[] = ['role'=>$h['role'],'content'=>$h['content']];
}
$messages[] = ['role'=>'user','content'=>$message];

// === 1. GROQ (ultra-rapide) ===
$answer = callGroq($GROQ_KEY, $messages);
$source = 'groq';

// === 2. MISTRAL (fallback) ===
if (!$answer) {
    $answer = callMistral($MISTRAL_KEY, $messages);
    $source = 'mistral';
}

// === 3. FAQ BDD (fallback ultime) ===
if (!$answer) {
    try {
        $stmt = $bdd->prepare("SELECT * FROM faq_g2b WHERE status='approved' AND (question LIKE :q OR answer LIKE :q2) LIMIT 3");
        $like = "%$message%";
        $stmt->execute(['q'=>$like,'q2'=>$like]);
        $faqs = $stmt->fetchAll();
        if ($faqs) {
            $answer = '';
            foreach ($faqs as $f) $answer .= "📌 **{$f['question']}**\n{$f['answer']}\n\n";
            $source = 'faq_bdd';
        }
    } catch (Exception $e) {}
}

echo json_encode(['reply'=>$answer ?: 'Scusi! Les serveurs IA sont saturés. Réessaie ou demande-moi les données live ! 🏎️', 'source'=>$source]);

function callGroq($key, $messages) {
    $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$key, 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['model'=>'llama-3.3-70b-versatile','messages'=>$messages,'temperature'=>0.4,'max_tokens'=>800]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code === 200 && $res) {
        $data = json_decode($res, true);
        return $data['choices'][0]['message']['content'] ?? null;
    }
    return null;
}

function callMistral($key, $messages) {
    $ch = curl_init('https://api.mistral.ai/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$key, 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['model'=>'mistral-small-latest','messages'=>$messages,'temperature'=>0.3,'max_tokens'=>600]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code === 200 && $res) {
        $data = json_decode($res, true);
        return $data['choices'][0]['message']['content'] ?? null;
    }
    return null;
}
