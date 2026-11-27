import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import '@fontsource-variable/outfit';
import './styles.css';
import { startAutoSync } from './sync';

registerSW({ immediate: true });
startAutoSync();
// Android share sheet: the manifest's share_target opens /recipes/?title=…&text=…&url=…
const shared = new URLSearchParams(location.search);
if (shared.has('url') || shared.has('text')) {
  const all = [shared.get('title'), shared.get('text'), shared.get('url')].filter(Boolean).join('\n');
  const url = shared.get('url') || all.match(/https?:\/\/\S+/)?.[0];
  try { sessionStorage.setItem('shared_in', JSON.stringify(url ? { url } : { text: all })); } catch { /* private mode */ }
  history.replaceState(null, '', location.pathname + '#/add');
}

createRoot(document.getElementById('root')!).render(<App />);
