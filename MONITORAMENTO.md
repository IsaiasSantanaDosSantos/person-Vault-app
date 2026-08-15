# Monitoramento

> Monitoramento informal, de melhor esforço, adequado a um projeto pessoal. Isto **não é um SLA contratual** — não há garantia formal de disponibilidade nem indenização por indisponibilidade.

## O que é monitorado

Monitoramento sintético externo (uptime), via [UptimeRobot](https://uptimerobot.com) (plano gratuito):

1. **Aplicação** — checagem HTTPS na URL de produção (`https://pessoal-vault-app-flax.vercel.app`), a cada 5 minutos.
2. **Supabase** — checagem HTTPS no endpoint público de saúde do projeto (`${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, sem autenticação), como sinal antecipado de degradação do lado do backend, independente do [status.supabase.com](https://status.supabase.com).

Não há APM nem rastreamento de erros (ex: Sentry) — introduzir isso significaria um novo fluxo de dados de terceiros para um app que lida com segredos sensíveis, e não é necessário pra um projeto pessoal sem SLA.

## Alertas

E-mail para santanawebdev@gmail.com quando um monitor cai ou volta.

## Status page pública

_A publicar — URL pendente de configuração no painel do UptimeRobot._

## Checklist de configuração (manual, feito fora do código)

- [ ] Criar conta gratuita no UptimeRobot.
- [ ] Cadastrar os dois monitores descritos acima.
- [ ] Configurar o contato de alerta por e-mail.
- [ ] Publicar a status page pública e atualizar a URL neste documento.

## Fora de escopo

Infraestrutura dedicada, backups multi-região, plano formal de recuperação de desastre e SLA contratual de disponibilidade — ver seção 9.2 do [README.md](README.md) e do [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md), que documentam esses itens como melhorias possíveis, mas fora do escopo de um projeto pessoal auto-hospedado no plano gratuito.
