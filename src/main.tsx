import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registrado com sucesso:', reg.scope))
        .catch((err) => console.warn('Erro ao registrar Service Worker:', err));
    });
  } else {
    // Em desenvolvimento, desregistra qualquer Service Worker ativo para evitar conflitos de cache e tela branca
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('Service Worker antigo desativado para evitar cache em ambiente de desenvolvimento.');
          });
        }
        // Recarrega uma vez para garantir que o controle do cache foi liberado
        window.location.reload();
      }
    });
  }
}

