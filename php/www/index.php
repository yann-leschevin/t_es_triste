<?php // Compte la visite (voir leschevin.com/stats.php) — sans effet en local
if (is_file(__DIR__ . '/../compter_visite.php')) { require_once __DIR__ . '/../compter_visite.php'; compter_visite('t_es_triste'); } ?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>T_es_triste</title>

    <link rel="stylesheet"
          href="static/style.css">
</head>
<body>
    <h1 class="game-title">T_ES_TRISTE</h1>

    <main class="game">
        <section class="board-container">
            <canvas id="board" width="300" height="600"></canvas>

            <div id="overlay" class="overlay hidden">
                <h2 id="overlay-title">Pause</h2>
                <p id="overlay-text">Appuie sur P pour continuer</p>

                <!-- Saisie des initiales quand le score entre dans le classement -->
                <form id="record-form" class="record-form hidden" autocomplete="off">
                    <label for="initiales">Nouveau record ! Tes initiales :</label>
                    <input id="initiales" name="initiales" maxlength="3" required
                           pattern="[A-Z]{3}" placeholder="AAA" spellcheck="false"
                           autocapitalize="characters" inputmode="text">
                    <button type="submit">Enregistrer</button>
                    <p id="record-message" class="record-message" role="status"></p>
                </form>
            </div>
        </section>

        <aside class="sidebar">
            <section class="panel">
                <h2>Pièce suivante</h2>
                <canvas id="next" width="120" height="120"></canvas>
            </section>

            <section class="panel stats">
                <p>Score <strong id="score">0</strong></p>
                <p>Lignes <strong id="lines">0</strong></p>
                <p>Niveau <strong id="level">1</strong></p>
            </section>

            <section class="panel controls">
                <h2>Commandes</h2>
                <p>← → : déplacer</p>
                <p>↓ : accélérer</p>
                <p>↑ / X : rotation</p>
                <p>Z : rotation inverse</p>
                <p>Espace : chute directe</p>
                <p>T-Spin : 2 × 4 lignes (1600/niveau)</p>
                <p>P : pause</p>
                <p>R : recommencer</p>
            </section>

            <button id="restart" type="button">Recommencer</button>
        </aside>

        <aside class="sidebar scores-sidebar">
            <section class="panel scores">
                <h2>Meilleurs scores</h2>
                <ol id="scores-list" class="scores-list">
                    <li class="scores-empty">Chargement…</li>
                </ol>
            </section>
        </aside>
    </main>

    <script src="static/t_es_triste.js"></script>
</body>
</html>
