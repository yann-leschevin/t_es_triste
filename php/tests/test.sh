#!/usr/bin/env bash
# Tests locaux : lance le serveur PHP intégré sur www/ puis vérifie les pages.
# Usage : bash tests/test.sh   (depuis le dossier du projet)
# NB : le serveur intégré de PHP ignore les .htaccess (ils seront actifs chez OVH).
set -u
cd "$(dirname "$0")/.."
# Copie temporaire de www/ : les tests n'écrivent jamais dans le vrai data/scores.json
TMPW=$(mktemp -d); cp -r www "$TMPW/www"; rm -f "$TMPW/www/data/scores.json"
WWW="$TMPW/www"
PORT="${PORT:-18765}"
BASE="http://127.0.0.1:$PORT"
if curl -s --max-time 10 -o /dev/null "$BASE/"; then echo "Port $PORT déjà utilisé : relancer avec PORT=xxxx bash tests/test.sh"; exit 2; fi
php -S 127.0.0.1:$PORT -t "$WWW" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; rm -rf "$TMPW"' EXIT
for _ in $(seq 50); do curl -s --max-time 10 -o /dev/null "$BASE/" && break; sleep 0.1; done
OK=0; KO=0
check() { # description, commande
    if eval "$2" >/dev/null 2>&1; then echo "  OK  $1"; OK=$((OK+1)); else echo "  KO  $1"; KO=$((KO+1)); fi
}
code() { curl -s --max-time 10 -o /dev/null -w '%{http_code}' "$@"; }
body() { curl -s --max-time 10 "$@"; }
echo "T_es_triste"
check "page d'accueil 200"            '[ "$(code $BASE/)" = 200 ]'
check "canvas du jeu présent"         'body $BASE/ | grep -q "id=\"board\""'
check "plus de syntaxe Jinja"         '! body $BASE/ | grep -q "{{"'
check "CSS servi"                     '[ "$(code $BASE/static/style.css)" = 200 ]'
check "JS servi"                      '[ "$(code $BASE/static/t_es_triste.js)" = 200 ]'
check "JS syntaxiquement valide"      'node --check www/static/t_es_triste.js'
J() { php -r '$j=json_decode(stream_get_contents(STDIN),true); exit(('"$1"') ? 0 : 1);'; }
post() { curl -s --max-time 10 -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" --data "$1" $BASE/scores.php; }
echo "Meilleurs scores"
check "JS des scores présent"          'grep -q "scores.php" www/static/t_es_triste.js'
check "formulaire initiales présent"   'body $BASE/ | grep -q "id=\"initiales\""'
check "GET sans fichier : liste vide"  'body $BASE/scores.php | J "\$j[\"ok\"]===true && \$j[\"scores\"]===[]"'
check "initiales minuscules refusées"  '[ "$(post "{\"initiales\":\"abc\",\"score\":100,\"lignes\":1,\"niveau\":1}")" = 400 ]'
check "initiales à 2 lettres refusées" '[ "$(post "{\"initiales\":\"AB\",\"score\":100,\"lignes\":1,\"niveau\":1}")" = 400 ]'
check "score texte refusé"             '[ "$(post "{\"initiales\":\"ABC\",\"score\":\"100\",\"lignes\":1,\"niveau\":1}")" = 400 ]'
check "score énorme refusé"            '[ "$(post "{\"initiales\":\"ABC\",\"score\":99999999,\"lignes\":1,\"niveau\":1}")" = 400 ]'
check "score valide enregistré"        '[ "$(post "{\"initiales\":\"YLE\",\"score\":1234,\"lignes\":5,\"niveau\":1}")" = 200 ]'
check "envoi trop rapproché refusé"    '[ "$(post "{\"initiales\":\"ABC\",\"score\":500,\"lignes\":1,\"niveau\":1}")" = 429 ]'
check "score relu par GET"             'body $BASE/scores.php | J "\$j[\"scores\"][0][\"initiales\"]===\"YLE\" && \$j[\"scores\"][0][\"score\"]===1234"'
# Classement plein (10 scores de 1000 à 10000) : un 5500 entre 6e, le 1000 sort
php -r '$s=[];for($i=10;$i>=1;$i--)$s[]=["initiales"=>"AAA","score"=>$i*1000,"lignes"=>$i,"niveau"=>1,"date"=>"2026-01-01","id"=>"x$i"];file_put_contents($argv[1],json_encode(["scores"=>$s,"envois"=>[]]));' "$WWW/data/scores.json"
check "classement : rang 6 et top 10"  'curl -s --max-time 10 -X POST -H "Content-Type: application/json" --data "{\"initiales\":\"NEW\",\"score\":5500,\"lignes\":9,\"niveau\":2}" $BASE/scores.php | J "\$j[\"rang\"]===6 && count(\$j[\"scores\"])===10 && end(\$j[\"scores\"])[\"score\"]===2000"'
check "IP non stockée en clair"        '! grep -q "127.0.0.1" "$WWW/data/scores.json"'
echo "$OK réussi(s), $KO échec(s)"; [ $KO -eq 0 ]
