/**
 * src/lib/tinyMceLoader.ts
 *
 * lib-Isolation Rule: wszystka logika ładowania TinyMCE musi żyć tutaj.
 * Komponenty UI importują wyłącznie gotowe funkcje — nie inline skryptów.
 *
 * Zasoby hostowane na Quanti CDN (R2):
 *   https://cdn.quanti-system.cloud/libs/tinymce/tinymce.min.js
 *
 * Zero-Egress: żadne żądanie nie kieruje do zewnętrznych sieci (cdn.tiny.cloud).
 */

/** URL biblioteki TinyMCE na wewnętrznym buckecie Quanti R2 */
export const QUANTI_TINYMCE_CDN_URL =
    'https://cdn.quanti-system.cloud/libs/tinymce/tinymce.min.js';

/** ID tagu <script> wstrzykiwanego w <head> – zapobiega duplikatom */
const SCRIPT_ID = 'tinymce-quanti-cdn-script';

/**
 * Ładuje TinyMCE z Quanti CDN (R2) i rozwiązuje Promise gdy biblioteka jest gotowa.
 *
 * Gwarancje:
 *  - Idempotentne: wielokrotne wywołania nie tworzą duplikatów tagów <script>
 *  - Jeśli window.tinymce już istnieje – rozwiązuje natychmiast
 *  - Jeśli tag już istnieje, ale tinymce nie gotowe – polluje co 50 ms (timeout 10 s)
 *
 * @param cdnUrl – nadpisuje domyślny URL (przydatne w testach / staging)
 */
export function loadTinyMceFromQuantiCdn(
    cdnUrl: string = QUANTI_TINYMCE_CDN_URL
): Promise<void> {
    return new Promise((resolve, reject) => {
        // Biblioteka już załadowana – nic do roboty
        if ((window as any).tinymce) {
            resolve();
            return;
        }

        // Tag <script> już wstrzyknięty, ale tinymce jeszcze nie gotowe – polluj
        const existing = document.getElementById(SCRIPT_ID);
        if (existing) {
            const poll = setInterval(() => {
                if ((window as any).tinymce) {
                    clearInterval(poll);
                    resolve();
                }
            }, 50);
            setTimeout(() => {
                clearInterval(poll);
                reject(new Error('TinyMCE load timeout (Quanti CDN)'));
            }, 10_000);
            return;
        }

        // Pierwsze ładowanie – wstrzyknij <script>
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = cdnUrl;
        script.onload = () => resolve();
        script.onerror = () =>
            reject(new Error(`Failed to load TinyMCE from Quanti CDN: ${cdnUrl}`));
        document.head.appendChild(script);
    });
}
