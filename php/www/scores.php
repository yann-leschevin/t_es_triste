<?php
// Meilleurs scores de T_es_triste, gardés dans data/scores.json (le top 10).
//   GET  scores.php  → {"ok":true,"scores":[{initiales,score,lignes,niveau,date}, ...]}
//   POST scores.php  → corps JSON {"initiales":"ABC","score":1234,"lignes":12,"niveau":2}
//
// data/ est bloqué côté web (data/.htaccess) et créé automatiquement.
// Le fichier n'est pas dans le dossier envoyé par preparer_envoi.sh : un nouvel
// envoi FTP n'efface donc pas les scores déjà enregistrés en ligne.
// NB : le score est calculé dans le navigateur, un tricheur motivé peut donc
// envoyer un faux score. Les contrôles ci-dessous limitent seulement les abus.

const SCORES_MAX = 10;               // taille du classement
const SCORE_LIMITE = 9999999;        // au-delà : refusé
const DELAI_ENTRE_ENVOIS = 10;       // secondes, par adresse IP
$fichier = __DIR__ . '/data/scores.json';

function repondre(array $donnees, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function erreur(int $code, string $message): void
{
    repondre(['ok' => false, 'error' => $message], $code);
}

/** Ouvre (et crée si besoin) le fichier, verrouillé, et renvoie [poignée, contenu]. */
function ouvrir(string $fichier, bool $ecriture): array
{
    $dossier = dirname($fichier);
    if (!is_dir($dossier) && !mkdir($dossier, 0755, true) && !is_dir($dossier)) {
        erreur(500, 'Impossible de créer le dossier des scores.');
    }
    $h = fopen($fichier, 'c+');
    if ($h === false) {
        erreur(500, 'Impossible d\'ouvrir le fichier des scores.');
    }
    flock($h, $ecriture ? LOCK_EX : LOCK_SH);
    $brut = stream_get_contents($h);
    $donnees = json_decode($brut ?: '', true);
    if (!is_array($donnees)) {
        $donnees = [];
    }
    $donnees += ['scores' => [], 'envois' => []];
    return [$h, $donnees];
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($methode === 'GET') {
    if (!is_file($fichier)) {
        repondre(['ok' => true, 'scores' => [], 'max' => SCORES_MAX]);
    }
    [$h, $donnees] = ouvrir($fichier, false);
    flock($h, LOCK_UN);
    fclose($h);
    repondre(['ok' => true, 'scores' => $donnees['scores'], 'max' => SCORES_MAX]);
}

if ($methode !== 'POST') {
    header('Allow: GET, POST');
    erreur(405, 'Méthode non autorisée.');
}

// ---- Lecture et contrôle de l'envoi ----
$corps = json_decode((string) file_get_contents('php://input', false, null, 0, 2000), true);
if (!is_array($corps)) {
    erreur(400, 'Données invalides.');
}
$initiales = (string) ($corps['initiales'] ?? '');
if (!preg_match('/^[A-Z]{3}$/', $initiales)) {
    erreur(400, 'Les initiales doivent être 3 lettres majuscules (A à Z).');
}
foreach (['score', 'lignes', 'niveau'] as $champ) {
    if (!isset($corps[$champ]) || !is_int($corps[$champ]) || $corps[$champ] < 0) {
        erreur(400, "Valeur « $champ » invalide.");
    }
}
$score = $corps['score'];
$lignes = $corps['lignes'];
$niveau = $corps['niveau'];
if ($score < 1 || $score > SCORE_LIMITE || $lignes > 100000 || $niveau < 1 || $niveau > 1000) {
    erreur(400, 'Score invalide.');
}

[$h, $donnees] = ouvrir($fichier, true);

// Limite d'envois : une empreinte de l'IP (jamais l'IP en clair), oubliée après le délai.
$maintenant = time();
$empreinte = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __FILE__), 0, 16);
$donnees['envois'] = array_filter($donnees['envois'], function ($t) use ($maintenant) {
    return $maintenant - $t < DELAI_ENTRE_ENVOIS;
});
if (isset($donnees['envois'][$empreinte])) {
    flock($h, LOCK_UN);
    fclose($h);
    erreur(429, 'Patiente quelques secondes avant d\'enregistrer un nouveau score.');
}
$donnees['envois'][$empreinte] = $maintenant;

// ---- Insertion et classement ----
$nouveau = [
    'initiales' => $initiales,
    'score' => $score,
    'lignes' => $lignes,
    'niveau' => $niveau,
    'date' => date('Y-m-d'),
    'id' => bin2hex(random_bytes(4)),
];
$scores = $donnees['scores'];
$scores[] = $nouveau;
usort($scores, function (array $a, array $b): int {
    return $b['score'] <=> $a['score']; // à égalité, le plus ancien reste devant (tri stable)
});
$scores = array_slice($scores, 0, SCORES_MAX);
$donnees['scores'] = $scores;

$rang = null;
foreach ($scores as $i => $s) {
    if ($s['id'] === $nouveau['id']) {
        $rang = $i + 1;
    }
}

ftruncate($h, 0);
rewind($h);
fwrite($h, json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
fflush($h);
flock($h, LOCK_UN);
fclose($h);

repondre(['ok' => true, 'rang' => $rang, 'id' => $nouveau['id'], 'scores' => $scores, 'max' => SCORES_MAX]);
