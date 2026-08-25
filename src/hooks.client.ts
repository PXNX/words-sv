/**
 * Papier & Tinte PWA bootstrap: register the root worker explicitly because
 * SvelteKit renders from app.html rather than Vite's conventional index.html.
 */
if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('WordCircle service worker registration failed.', error);
    });
  };

  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });
}
