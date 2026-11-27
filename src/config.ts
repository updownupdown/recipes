// OAuth Client ID is public by design (it's visible to every browser that loads the app).
export const GOOGLE_CLIENT_ID = '855215727467-uje1ugqvrv661d60dk4qi3eddvnflsud.apps.googleusercontent.com';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Address of the free Cloudflare Worker in worker/recipe-reader.js, used by "Add from a web link".
// Empty until the worker is deployed; the app then offers paste instead.
export const RECIPE_READER_URL = '';
