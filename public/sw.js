// Service worker mínimo — só o necessário para o navegador permitir
// "Adicionar à tela inicial". Não faz cache agressivo de dados,
// já que este é um app de senhas e sempre deve buscar dados frescos.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Sem handler de "fetch" de propósito — este é um app de senhas e
// sempre deve buscar dados frescos, sem cache customizado. Um handler
// vazio (`() => {}`) faz o Chrome avisar "no-op fetch handler" no
// console à toa; o service worker continua funcionando normalmente
// pra instalação como PWA sem ele.
