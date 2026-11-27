import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import '@fontsource-variable/outfit';
import './styles.css';
import { startAutoSync } from './sync';

registerSW({ immediate: true });
startAutoSync();
createRoot(document.getElementById('root')!).render(<App />);
