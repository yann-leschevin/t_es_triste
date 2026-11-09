# t_es_triste — version PHP (OVH)

Jeu de blocs en JavaScript (canvas). PHP ne fait que servir la page.

Portage de https://github.com/yann-leschevin/t_es_triste (Flask → PHP).
Renommé (l'ancien nom est une marque déposée). La version Pygame bureau n'est pas reprise.

## Arborescence
- `www/` : **seul dossier à envoyer** (son contenu va dans `www/projets/t_es_triste/` chez OVH).
- `www/scores.php` : meilleurs scores (top 10), enregistrés dans `www/data/scores.json`.
  Le fichier est créé automatiquement, bloqué côté web (`data/.htaccess`) et **jamais envoyé**
  par `preparer_envoi.sh` : un nouvel envoi n'efface pas les scores en ligne.
  En fin de partie, si le score entre dans le top 10, le joueur saisit 3 initiales en majuscules.
  Le score étant calculé dans le navigateur, un tricheur peut envoyer un faux score
  (pour l'effacer : modifier `data/scores.json` par FTP).
- `tests/test.sh` : tests locaux (`bash tests/test.sh`, PHP + curl requis). Ne pas envoyer.

## Tester en local
```bash
php -S 127.0.0.1:18765 -t www     # puis http://127.0.0.1:18765/
bash tests/test.sh
```
Le serveur intégré de PHP ignore les `.htaccess` : ils ne s'appliqueront que chez OVH.
