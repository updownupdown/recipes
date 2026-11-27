# MyRecipes

A personal recipe box: an installable, offline-first PWA hosted on GitHub Pages at
https://updownupdown.github.io/recipes/

- Recipes are stored on the device (IndexedDB) and work with no connection.
- Google Drive sync (coming): one `MyRecipes/recipes.json` file in your Drive.
- Share a recipe as a link: the recipe is compressed into the URL fragment (`#/r/...`), so no server stores it.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173/recipes/
npm test
npm run build
```

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`.
