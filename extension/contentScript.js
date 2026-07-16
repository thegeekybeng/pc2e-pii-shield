// Content script - runs in isolated world, has access to chrome.storage
console.log("🛡️ PII Shield Content Script: Initializing...");

// 1. Inject inject.js into the main page context
function injectScript(file) {
  const container = document.head || document.documentElement;
  const scriptTag = document.createElement('script');
  scriptTag.setAttribute('type', 'text/javascript');
  scriptTag.setAttribute('src', chrome.runtime.getURL(file));
  container.appendChild(scriptTag);
  scriptTag.onload = () => {
    scriptTag.remove();
    syncRosterToPage(); // Sync roster as soon as script loads
  };
}

// 2. Read roster from chrome.storage and postMessage to page context
function syncRosterToPage() {
  chrome.storage.local.get(["piiRoster"], (result) => {
    const roster = result.piiRoster || [];
    window.postMessage({
      type: "PII_SHIELD_ROSTER_UPDATE",
      roster: roster
    }, "*");
  });
}

// Listen for storage changes to sync updates in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.piiRoster) {
    syncRosterToPage();
  }
});

// Run script injection
injectScript('inject.js');
