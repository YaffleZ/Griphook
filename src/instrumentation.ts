/**
 * Next.js instrumentation hook - runs once at server startup before any requests.
 * Patches both Node's https.globalAgent and undici's global dispatcher to trust
 * the corporate CA bundle, which is required for Azure SDK calls through a
 * corporate TLS inspection proxy.
 *
 * node:https (https.request) respects NODE_EXTRA_CA_CERTS, but
 * undici (which powers Node 18+ built-in fetch and @azure/core-rest-pipeline) does not.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const caBundlePath = process.env.NODE_EXTRA_CA_CERTS;
  if (!caBundlePath) return;

  try {
    const { readFileSync, existsSync } = await import('fs');
    if (!existsSync(caBundlePath)) {
      console.warn(`[TLS] NODE_EXTRA_CA_CERTS path not found: ${caBundlePath}`);
      return;
    }

    const ca = readFileSync(caBundlePath);

    // 1. Patch https.globalAgent for clients using https.request
    //    (may be read-only in bundled context — that's fine, we just skip it)
    try {
      const https = await import('https');
      https.globalAgent = new https.Agent({ ca });
      console.log('[TLS] https.globalAgent patched');
    } catch {
      // read-only in bundled Next.js context — not fatal
    }

    // 2. Patch undici global dispatcher for clients using fetch() (Node 18+)
    //    @azure/core-rest-pipeline uses globalThis.fetch which is undici-backed
    //    setGlobalDispatcher affects ALL undici fetch calls including globalThis.fetch
    try {
      const { Agent, setGlobalDispatcher } = await import('undici');
      setGlobalDispatcher(new Agent({ connect: { ca } }));
      console.log('[TLS] undici global dispatcher patched');
    } catch (e) {
      console.warn('[TLS] Could not patch undici dispatcher:', e);
    }

    console.log(`[TLS] Corporate CA loaded from ${caBundlePath}`);
  } catch (err) {
    console.warn('[TLS] Failed to configure corporate CA:', err);
  }
}
