const DEFAULT_SERVER = "http://localhost:3000";
const serverInput = document.getElementById("server");
const statusEl = document.getElementById("status");

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = `status ${ok ? "ok" : "bad"}`;
}

async function check() {
  const res = await chrome.runtime.sendMessage({ type: "api", path: "/api/profiles" });
  if (res?.ok) {
    const reviewed = res.data.filter((c) => c.reviewed).length;
    setStatus(`Connected · ${res.data.length} client(s), ${reviewed} reviewed`, true);
  } else {
    setStatus(res?.data?.error || "Not connected", false);
  }
}

chrome.storage.local.get("server").then(({ server }) => {
  serverInput.value = server || DEFAULT_SERVER;
  check();
});

serverInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ server: serverInput.value.trim() || DEFAULT_SERVER });
  check();
});

document.getElementById("inject").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    window.close();
  } catch (err) {
    setStatus(`Can't run on this page: ${err.message}`, false);
  }
});

document.getElementById("dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: serverInput.value.trim() || DEFAULT_SERVER });
});
