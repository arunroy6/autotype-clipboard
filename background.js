// Background service worker for AutoType Clipboard extension

// Lightweight compatibility wrapper: prefer `browser`, fall back to `chrome`.
const ext = (typeof browser !== 'undefined') ? browser : (typeof chrome !== 'undefined' ? chrome : undefined);

// Helper to get clipboard text in a secure extension context
async function getClipboardText() {
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    console.error("Failed to read clipboard in background script:", err);
    return null;
  }
}

// Listen for keyboard commands defined in manifest.json
ext.commands.onCommand.addListener(async (command) => {
  if (command === "trigger-autotype") {
    const text = await getClipboardText();
    if (!text) {
      console.warn("Clipboard is empty or inaccessible.");
      return;
    }

    // Retrieve user settings from storage
    const settings = await ext.storage.local.get({
      typingDelay: 100,
      typingMode: "character",
      randomizeDelay: true,
      randomizePercentage: 15
    });

    // Send to active tab's content script
    const tabs = await ext.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].id !== undefined) {
      ext.tabs.sendMessage(tabs[0].id, {
        action: "typeText",
        text: text,
        delay: settings.typingDelay,
        mode: settings.typingMode,
        randomizeDelay: settings.randomizeDelay,
        randomizePercentage: settings.randomizePercentage
      }).catch(err => {
        console.error("Failed to send message to content script:", err);
      });
    }
  }
});

// Listen for messages from content script or popup
ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "readClipboard") {
    getClipboardText().then(text => {
      sendResponse({ text: text });
    });
    return true; // Indicates async response
  }
});
