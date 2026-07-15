# Contexto — Classificação de transações

Objetivo: extrair merchant, brand, category, subcategory e confidence a partir de notificações bancárias.

Regras:
- merchant: nome do estabelecimento ou beneficiário.
- brand: marca quando identificável (ex.: McDonald's, Uber).
- category: uma das categorias permitidas nas regras de negócio.
- subcategory: uma das subcategorias permitidas.
- confidence: número de 0 a 1 (ex.: 0.92).
- Retorne APENAS JSON válido, sem markdown.
