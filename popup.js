// Script for AutoType Clipboard extension popup

document.addEventListener('DOMContentLoaded', async () => {
  // Lightweight compatibility wrapper: prefer `browser`, fall back to `chrome`.
  const ext = (typeof browser !== 'undefined') ? browser : (typeof chrome !== 'undefined' ? chrome : undefined);
  // Elements
  const btnAutoType = document.getElementById('btn-autotype');
  const modeChar = document.getElementById('mode-char');
  const modeInst = document.getElementById('mode-inst');
  const sliderDelay = document.getElementById('slider-delay');
  const delayValue = document.getElementById('delay-value');
  const delayContainer = document.getElementById('delay-container');
  const toggleFab = document.getElementById('toggle-fab');
  const placementContainer = document.getElementById('placement-container');
  const placementInput = document.getElementById('placement-input');
  const placementView = document.getElementById('placement-view');
  const sliderRandomize = document.getElementById('slider-randomize');
  const randomizeContainer = document.getElementById('randomize-container');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  const randomizeValue = document.getElementById('randomize-value');
  const testTextarea = document.getElementById('test-textarea');
  const delayLog = document.getElementById('delay-log');
  const btnClearTest = document.getElementById('btn-clear-test');
  const btnLocalTest = document.getElementById('btn-local-test');
  const statusText = document.getElementById('status-text');

  let currentMode = 'character'; // 'character' or 'instant'
  let currentPlacement = 'input'; // 'input' or 'viewport'
  let currentRandomize = true;
  let currentRandomizePercent = 15;

  // Helper to update status bar
  function updateStatus(message, type = '') {
    statusText.textContent = message;
    statusText.className = type; // reset class or set success/error
  }

  // Load saved settings
  const settings = await ext.storage.local.get({
    typingDelay: 100,
    typingMode: 'character',
    showFloatingButton: true,
    buttonPlacement: 'input',
    randomizeDelay: true,
    randomizePercentage: 15
  });

  // Apply settings to UI
  currentMode = settings.typingMode;
  currentPlacement = settings.buttonPlacement;
  // Derive enabled state from stored percentage (0 = disabled)
  currentRandomizePercent = settings.randomizePercentage;
  currentRandomize = currentRandomizePercent > 0;
  sliderDelay.value = settings.typingDelay;
  delayValue.textContent = `${settings.typingDelay}ms`;
  toggleFab.checked = settings.showFloatingButton;
  sliderRandomize.value = currentRandomizePercent;
  randomizeValue.textContent = `${currentRandomizePercent}%`;

  if (currentMode === 'character') {
    modeChar.classList.add('active');
    modeInst.classList.remove('active');
    delayContainer.classList.remove('hidden');
    randomizeContainer.classList.remove('hidden')
  } else {
    modeChar.classList.remove('active');
    modeInst.classList.add('active');
    delayContainer.classList.add('hidden');
    randomizeContainer.classList.add('hidden');
  }

  if (currentPlacement === 'input') {
    placementInput.classList.add('active');
    placementView.classList.remove('active');
  } else {
    placementInput.classList.remove('active');
    placementView.classList.add('active');
  }

  // Toggle placement settings section depending on general FAB state
  function updatePlacementVisibility(showFAB) {
    if (showFAB) {
      placementContainer.classList.remove('hidden');
    } else {
      placementContainer.classList.add('hidden');
    }
  }
  updatePlacementVisibility(settings.showFloatingButton);

  // Settings: Mode Selector
  modeChar.addEventListener('click', () => {
    currentMode = 'character';
    modeChar.classList.add('active');
    modeInst.classList.remove('active');
    delayContainer.classList.remove('hidden');
    randomizeContainer.classList.remove('hidden');
    saveSettings();
  });

  modeInst.addEventListener('click', () => {
    currentMode = 'instant';
    modeChar.classList.remove('active');
    modeInst.classList.add('active');
    delayContainer.classList.add('hidden');
    randomizeContainer.classList.add('hidden');
    saveSettings();
  });

  // Settings: Delay Slider
  sliderDelay.addEventListener('input', (e) => {
    delayValue.textContent = `${e.target.value}ms`;
  });

  sliderDelay.addEventListener('change', () => {
    saveSettings();
  });

  // Settings: Randomize percentage slider (0 disables randomization)
  sliderRandomize.addEventListener('input', (e) => {
    let value = parseInt(e.target.value, 10);
    if (Number.isNaN(value)) value = 0;
    currentRandomizePercent = Math.max(0, Math.min(99, value));
    currentRandomize = currentRandomizePercent > 0;
    sliderRandomize.value = currentRandomizePercent;
    randomizeValue.textContent = `${currentRandomizePercent}%`;
  });

  sliderRandomize.addEventListener('change', () => {
    saveSettings();
  });

  // Settings: FAB Toggle
  toggleFab.addEventListener('change', () => {
    const showFAB = toggleFab.checked;
    updatePlacementVisibility(showFAB);
    saveSettings();
    // Notify content script on the active tab of the changed FAB preference
    notifyActiveTab({
      action: "updateSettings",
      showFloatingButton: showFAB,
      buttonPlacement: currentPlacement
    });
  });

  // Settings: Placement Selector
  placementInput.addEventListener('click', () => {
    currentPlacement = 'input';
    placementInput.classList.add('active');
    placementView.classList.remove('active');
    saveSettings();
    notifyActiveTab({ action: "updateSettings", buttonPlacement: 'input' });
  });

  placementView.addEventListener('click', () => {
    currentPlacement = 'viewport';
    placementInput.classList.remove('active');
    placementView.classList.add('active');
    saveSettings();
    notifyActiveTab({ action: "updateSettings", buttonPlacement: 'viewport' });
  });

  // Reset to defaults
  btnResetDefaults.addEventListener('click', () => {
    // Defaults: typingDelay=100, randomizeDelay=true, randomizePercentage=15, typingMode=character, showFloatingButton=true, buttonPlacement=input
    currentRandomize = true;
    currentRandomizePercent = 15;
    currentMode = 'character';
    currentPlacement = 'input';

    sliderDelay.value = 100;
    delayValue.textContent = `100ms`;
    sliderRandomize.value = 15;
    randomizeValue.textContent = `15%`;
    modeChar.classList.add('active');
    modeInst.classList.remove('active');
    placementInput.classList.add('active');
    placementView.classList.remove('active');
    toggleFab.checked = true;
    updatePlacementVisibility(true);

    saveSettings();
    // Clear any test data when resetting defaults
    clearTestAndLog();
    notifyActiveTab({ action: "updateSettings", showFloatingButton: true, buttonPlacement: 'input' });
  });

  // Save all settings to browser storage
  function saveSettings() {
    ext.storage.local.set({
      typingDelay: parseInt(sliderDelay.value),
      typingMode: currentMode,
      showFloatingButton: toggleFab.checked,
      buttonPlacement: currentPlacement,
      randomizeDelay: currentRandomizePercent > 0,
      randomizePercentage: currentRandomizePercent
    });
  }

  // Helper to send messages to the active tab's content script
  async function notifyActiveTab(message) {
    try {
      const tabs = await ext.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].id !== undefined) {
        return await ext.tabs.sendMessage(tabs[0].id, message);
      }
    } catch (e) {
      console.warn("Failed to notify active tab:", e);
    }
    return null;
  }

  // Trigger: Auto-type into active web page
  btnAutoType.addEventListener('click', async () => {
    updateStatus("Reading clipboard...", "info");
    
    try {
      // 1. Read clipboard from popup context (safe, secure context, has permission)
      const text = await navigator.clipboard.readText();
      
      if (!text) {
        updateStatus("Error: Clipboard is empty!", "error");
        return;
      }

      // 2. Message the active tab content script to type the text
      updateStatus("Attempting to type...", "info");
      const response = await notifyActiveTab({
        action: "typeText",
        text: text,
        delay: currentMode === 'instant' ? 0 : parseInt(sliderDelay.value),
        mode: currentMode,
        randomizeDelay: currentMode !== 'instant' ? currentRandomize : false,
        randomizePercentage: currentMode !== 'instant' ? currentRandomizePercent : 0
      });

      if (response && response.success) {
        updateStatus("Success! Typing complete.", "success");
      } else {
        const errMsg = response?.error || "Error: Click in a text box first!";
        updateStatus(errMsg, "error");
      }
    } catch (err) {
      updateStatus("Clipboard block / permission error", "error");
      console.error("Popup auto-type error:", err);
    }
  });

  // Local simulated typing inside the test text area
  async function typeLocally(element, text) {
    const delay = currentMode === 'instant' ? 0 : parseInt(sliderDelay.value);
    const randomizeDelay = currentMode === 'instant' ? false : currentRandomize;
    const randomizePercentage = currentMode === 'instant' ? 0 : currentRandomizePercent;
    element.value = ''; // Clear for user clarity
    element.focus();

    // Clear prior session log and note start
    if (delayLog) delayLog.value = '';

    if (delay === 0) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      if (delayLog) delayLog.value += `0ms\nDone\n`;
      updateStatus("Local instant paste complete", "success");
      return;
    }

    updateStatus("Testing local type...", "info");
    for (let i = 0; i < text.length; i++) {
      element.value += text[i];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      if (i < text.length - 1) {
        const nextDelay = randomizeDelay
          ? getRandomizedDelay(delay, randomizePercentage)
          : delay;
        if (delayLog) delayLog.value += `${nextDelay}ms\n`;
        await new Promise(r => setTimeout(r, nextDelay));
      }
    }
    if (delayLog) delayLog.value += `Done\n`;
    updateStatus("Local typing test complete", "success");
  }

  function getRandomizedDelay(baseDelay, percentage) {
    const variation = Math.round(baseDelay * (percentage / 100));
    const min = Math.max(0, baseDelay - variation);
    const max = baseDelay + variation;
    return Math.round(Math.random() * (max - min) + min);
  }

  // Intercept the keyboard shortcut inside the test text area
  testTextarea.addEventListener('keydown', async (e) => {
    // Check for Alt+Shift+K (default) or Cmd+Option+K (Mac)
    const isHotkey = (e.altKey && e.shiftKey && e.key.toLowerCase() === 'k') || 
                     (e.metaKey && e.altKey && e.key.toLowerCase() === 'k');
    
    if (isHotkey) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          typeLocally(testTextarea, text);
        } else {
          updateStatus("Local test: Clipboard empty!", "error");
        }
      } catch (err) {
        console.error("Local test shortcut error:", err);
        updateStatus("Clipboard read blocked", "error");
      }
    }
  });

  // Clear log button
  // Shared clear function for test textarea and delay log
  function clearTestAndLog() {
    if (testTextarea) testTextarea.value = '';
    if (delayLog) delayLog.value = '';
  }

  if (btnClearTest) {
    btnClearTest.addEventListener('click', () => {
      clearTestAndLog();
      updateStatus('Cleared test field and delay log', 'info');
    });
  }

  // Run Test button (reads clipboard and invokes local typing)
  if (btnLocalTest) {
    btnLocalTest.addEventListener('click', async () => {
      btnLocalTest.disabled = true;
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          await typeLocally(testTextarea, text);
        } else {
          updateStatus("Local test: Clipboard empty!", "error");
        }
      } catch (err) {
        console.error("Local test button error:", err);
        updateStatus("Clipboard read blocked", "error");
      } finally {
        btnLocalTest.disabled = false;
      }
    });
  }
});
