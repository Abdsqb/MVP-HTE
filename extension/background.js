// Relays API calls for the content script. Fetching from the extension's own
// origin avoids page CORS / mixed-content rules on real carrier sites.
const DEFAULT_SERVER = "http://localhost:3000";

async function serverUrl() {
  const { server } = await chrome.storage.local.get("server");
  return (server || DEFAULT_SERVER).replace(/\/+$/, "");
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "api") return false;
  (async () => {
    const base = await serverUrl();
    try {
      const res = await fetch(base + msg.path, {
        method: msg.method || "GET",
        headers: msg.body ? { "Content-Type": "application/json" } : undefined,
        body: msg.body ? JSON.stringify(msg.body) : undefined,
      });
      const data = await res.json().catch(() => null);
      sendResponse({ ok: res.ok, status: res.status, data });
    } catch {
      sendResponse({ ok: false, status: 0, data: { error: `Can't reach Formwise at ${base}. Is "npm run dev" running?` } });
    }
  })();
  return true; // keep the channel open for the async response
});
