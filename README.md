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

## Add from a web link (recipe reader)

Browsers can't read other websites directly, so link import goes through a tiny free Cloudflare Worker,
`worker/recipe-reader.js`. It fetches the page, returns only its recipe data (schema.org JSON-LD, plus a
plain-text fallback), and only answers requests from this app's address.

1. Create a free Cloudflare account (no card needed), then Workers & Pages > Create > Create Worker.
2. Name it `myrecipes-reader`, Deploy, then Edit code, paste the whole file, and Deploy again.
3. Put the worker's `https://myrecipes-reader.<you>.workers.dev` address in `RECIPE_READER_URL` in `src/config.ts`.

The free plan allows 100,000 requests a day.
