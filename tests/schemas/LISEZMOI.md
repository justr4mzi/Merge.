# Pages de cahier pour tester la lecture des schémas

Deux fausses pages de cahier (écriture manuscrite, lignes, légère rotation et flou comme une photo) avec un vrai schéma de SVT légendé au milieu :

- `cahier-neurone.jpg` : schéma « Complete neuron cell diagram fr.svg » (Wikimedia Commons).
- `cahier-cellule.jpg` : schéma « Animal cell structure fr.svg » (Wikimedia Commons).

Les schémas viennent de Wikimedia Commons (voir la page de chaque fichier pour l'auteur et la licence). La police manuscrite est Caveat (Google Fonts, licence OFL).
`cadres-attendus.json` donne le vrai cadre de chaque schéma (haut, gauche, bas, droite, de 0 à 1000) avant la rotation. `fabriquer-pages.py` refait les pages.

Le test réel passe par la fonction `diag` (secret cron) qui envoie ces pages à `studio` (action `schema_test`) : même lecture qu'un vrai import.
