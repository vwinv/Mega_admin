# Comment utiliser ce kit dans Cursor

1. Crée un dossier sur ton ordinateur, par ex. `mega-app`, et mets-y les deux fichiers :
   `SPEC_APPLICATION.md` et le dossier `donnees/` (avec `mega_data.json`).
2. Ouvre ce dossier dans Cursor : File → Open Folder.
3. Ouvre le chat de Cursor (Cmd+L ou Ctrl+L), choisis le mode Agent, et tape :

   « Lis SPEC_APPLICATION.md et donnees/mega_data.json, puis réalise l'étape 1
   du plan (initialisation du projet + base de données + import des données). »

4. Quand l'étape 1 fonctionne (`npm run dev` affiche le site), demande l'étape 2,
   puis la 3, etc. Une étape par prompt : c'est plus fiable que tout demander d'un coup.
5. Pour tester : `npm run dev` puis ouvre http://localhost:3000 dans ton navigateur.

Conseils :
- Commit git après chaque étape qui marche (Cursor peut le faire : « fais un commit »).
- Si quelque chose casse, colle le message d'erreur dans le chat, Cursor corrigera.
- Le fichier Excel reste ta référence : tu pourras réimporter des données plus tard
  en demandant à Cursor « ajoute un import de fichier Excel avec la bibliothèque xlsx ».
