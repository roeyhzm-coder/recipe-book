export function registerPwaUpdates() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {});
        if (registration.waiting) window.location.reload();
        window.setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch(() => {});
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
