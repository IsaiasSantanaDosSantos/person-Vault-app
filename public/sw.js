// Service worker mínimo — só o necessário para o navegador permitir
// "Adicionar à tela inicial". Não faz cache agressivo de dados,
// já que este é um app de senhas e sempre deve buscar dados frescos.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // passthrough — sem cache customizado
});
