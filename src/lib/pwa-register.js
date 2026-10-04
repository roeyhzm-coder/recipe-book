export function registerPwaUpdates() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          window.location.reload();
        },
        onRegisteredSW(_url, registration) {
          if (!registration) return;
          registration.update().catch(() => {});
          window.setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000);
        },
      });
    })
    .catch(() => {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.update().catch(() => {}));
      }).catch(() => {});
    });
}
