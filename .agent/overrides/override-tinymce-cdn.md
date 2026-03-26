# Zasób Wewnętrzny: TinyMCE na Quanti CDN (R2)

> **Status: RESOLVED** — zewnętrzny CDN zastąpiony wewnętrznym hostem R2.
> Poprzedni override dla `cdn.tiny.cloud` nie jest już wymagany.

## Lokalizacja zasobu

| Atrybut | Wartość |
|---|---|
| **Bucket R2** | `quanti-modules-cdn` |
| **Ścieżka** | `/libs/tinymce/v7.x/` |
| **Publiczny URL** | `https://cdn.quanti-system.cloud/libs/tinymce/tinymce.min.js` |
| **MIME type** | `application/javascript` |
| **Domena** | `cdn.quanti-system.cloud` (Cloudflare R2 custom domain) |

## Uzasadnienie migracji (Zero-Egress)

Poprzednia implementacja ładowała TinyMCE z `cdn.tiny.cloud`, co powodowało:

1. **`net::ERR_CONNECTION_REFUSED`** — restrykcyjna polityka CSP platformy blokowała połączenia z zewnętrznymi hostami
2. **Zależność od zewnętrznej sieci** — naruszenie zasady Zero-Egress architektury Quanti
3. **Brak kontroli wersji** — zewnętrzny CDN mógł dostarczać inne wersje niż oczekiwano

## Implementacja (lib-Isolation Rule)

Logika ładowania skryptu wyizolowana w `src/lib/tinyMceLoader.ts`:

```typescript
// src/lib/tinyMceLoader.ts
export const QUANTI_TINYMCE_CDN_URL =
    'https://cdn.quanti-system.cloud/libs/tinymce/tinymce.min.js';

export function loadTinyMceFromQuantiCdn(cdnUrl = QUANTI_TINYMCE_CDN_URL): Promise<void>
```

- Komponenty UI importują wyłącznie `loadTinyMceFromQuantiCdn` — zero inline `<script>` w komponentach
- Idempotentne: wielokrotne wywołania nie tworzą duplikatów tagów `<script>`
- Timeout 10s z przyjaznym komunikatem błędu

## Upload zasobu (IaC — Wrangler)

```bash
# Upload TinyMCE do bucketu R2
wrangler r2 object put quanti-modules-cdn/libs/tinymce/tinymce.min.js \
  --file=./node_modules/tinymce/tinymce.min.js \
  --content-type=application/javascript \
  --remote

# Weryfikacja
wrangler r2 object get quanti-modules-cdn/libs/tinymce/tinymce.min.js --remote
```

## Status

**RESOLVED** — implementacja zakończona, testy GREEN (28/28 ✅).
