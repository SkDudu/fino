# Fino

App Android que transforma notificações bancárias em transações financeiras — 100% local, sem backend.

## O que é

O Fino escuta notificações de apps bancários no seu celular, interpreta o conteúdo (valor, tipo, estabelecimento, forma de pagamento) e sugere um lançamento para você revisar e salvar. Tudo acontece no dispositivo: captura, parsing, armazenamento e interface.

## Como funciona

1. Você concede acesso às notificações do Android.
2. O app filtra apenas notificações de bancos suportados (Nubank, Inter, Itaú, PicPay, C6, BB, Bradesco, Santander, Mercado Pago e outros).
3. Um parser por banco extrai os dados da notificação.
4. Uma prévia da transação aparece para aprovação.
5. Ao confirmar, o lançamento é salvo no SQLite e entra no saldo e no histórico.

Nada é enviado para a nuvem. O app funciona offline.

## Funcionalidades

- **Home** — saldo do dia, resumo de gastos/recebimentos, últimas transações e notificações
- **Aprovação** — revisar cada transação antes de salvar ou descartar
- **Histórico** — todas as notificações, transações salvas e descartadas
- **Filtros e busca** — por banco, categoria, tipo e texto
- **Deduplicação** — evita salvar a mesma notificação duas vezes

## Bancos com parser (V3)

Nubank, Inter, Itaú, PicPay, Mercado Pago, Banco do Brasil, Santander, Bradesco e C6 Bank.

## Stack

- Expo 54 + React Native + TypeScript + Expo Router
- Módulo nativo Kotlin (`NotificationListenerService`)
- SQLite (`expo-sqlite`)
- Parsers por regex e regras por banco

## Requisitos

- **Android** — o app usa `NotificationListenerService`, que não existe no iOS/web
- **Development build** — não roda no Expo Go; é preciso build nativo com `expo-dev-client`

## Como rodar

```bash
npm install
npx expo run:android
```

Para conceder acesso às notificações, abra as configurações do Android em **Acesso às notificações** e ative o Fino.

## Estrutura do projeto

```text
src/
  app/           # telas (home, notificações, transações, descartadas)
  parsers/       # engine e parsers por banco
  database/      # SQLite e repositórios
  services/      # pipeline de notificações
modules/
  notification-listener/   # módulo nativo Android
```

## Verificação do parser

```bash
npx tsx src/parsers/parser.check.ts
```

## Documentação

- [Spec V3](docs/v3) — especificação do produto
