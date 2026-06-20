// Content script for AutoType Clipboard extension
console.log("[AutoType] Content script active on:", window.location.href);

let lastActiveElement = null;
let isTyping = false;
let shouldStopTyping = false;
let fab = null;
let hideTimeout = null;

let currentPlacement = 'input'; // 'input' or 'viewport'
let isDragging = false;
let dragThresholdPassed = false;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;

// Traverse Shadow DOM to find the actual focused element
function getDeepActiveElement() {
  let element = document.activeElement;
  while (element && element.shadowRoot && element.shadowRoot.activeElement) {
    element = element.shadowRoot.activeElement;
  }
  return element;
}

// Helper to determine if an element is a text input, textarea, or contenteditable
function isTextInput(element) {
  if (!element) return false;
  
  // 1. Check contenteditable
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  // 2. Check tag name
  const tagName = element.tagName.toUpperCase();
  if (tagName === 'TEXTAREA') {
    return true;
  }

  if (tagName === 'INPUT') {
    const type = (element.getAttribute('type') || 'text').toLowerCase();
    const textInputTypes = [
      'text', 'search', 'url', 'tel', 'email', 'password', 'number'
    ];
    return textInputTypes.includes(type);
  }

  return false;
}

// Reposition the FAB next to the focused input field
function repositionAttachedFAB(element) {
  if (!element || !fab || currentPlacement !== 'input') return;
  const rect = element.getBoundingClientRect();
  
  const fabWidth = 36; // collapsed circle width
  const fabHeight = 36;
  
  let left = rect.right + 8;
  let top = rect.top + (rect.height - fabHeight) / 2;
  
  // If it goes off the right edge of the viewport, overlap it inside the input field at the right edge
  if (left + fabWidth > window.innerWidth) {
    left = rect.right - fabWidth - 4;
  }
  // Clamp inside top/bottom
  if (top < 8) top = 8;
  if (top + fabHeight > window.innerHeight - 8) {
    top = window.innerHeight - fabHeight - 8;
  }
  
  fab.style.position = 'fixed';
  fab.style.left = `${left}px`;
  fab.style.top = `${top}px`;
  fab.style.bottom = 'auto';
  fab.style.right = 'auto';
}

// Reposition on scroll or resize events so it tracks the element
function onScrollOrResize() {
  const activeEl = getDeepActiveElement();
  if (activeEl && isTextInput(activeEl)) {
    repositionAttachedFAB(activeEl);
  }
}
window.addEventListener('scroll', onScrollOrResize, true);
window.addEventListener('resize', onScrollOrResize, true);

// Intercept window events to keep track of the last focused input field
document.addEventListener('focusin', (e) => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  const target = getDeepActiveElement() || e.target;
  if (isTextInput(target)) {
    lastActiveElement = target;
    showFAB();
  }
}, true);

document.addEventListener('focusout', (e) => {
  hideTimeout = setTimeout(() => {
    const activeEl = getDeepActiveElement();
    if (!isTextInput(activeEl) && fab && activeEl !== fab && !isDragging) {
      hideFAB();
    }
  }, 200);
}, true);

// Check if an input is already focused on page load (e.g. Google Search)
const initialActive = getDeepActiveElement();
if (isTextInput(initialActive)) {
  lastActiveElement = initialActive;
  setTimeout(showFAB, 100);
}

// Reposition Viewport FAB to saved coordinates or default bottom-right
function applyViewportPosition() {
  if (!fab || currentPlacement !== 'viewport') return;

  const defaultLeft = window.innerWidth - 64;
  const defaultTop = window.innerHeight - 64;

  try {
    browser.storage.local.get({ viewportPosition: null }).then(settings => {
      const pos = settings.viewportPosition || getLocalFallbackPosition() || { left: defaultLeft, top: defaultTop };
      
      const maxLeft = window.innerWidth - fab.offsetWidth - 8;
      const maxTop = window.innerHeight - fab.offsetHeight - 8;
      const left = Math.max(8, Math.min(pos.left, maxLeft));
      const top = Math.max(8, Math.min(pos.top, maxTop));

      fab.style.position = 'fixed';
      fab.style.left = `${left}px`;
      fab.style.top = `${top}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }).catch(() => {
      fallbackPosition();
    });
  } catch (err) {
    fallbackPosition();
  }

  function fallbackPosition() {
    const pos = getLocalFallbackPosition() || { left: defaultLeft, top: defaultTop };
    fab.style.position = 'fixed';
    fab.style.left = `${pos.left}px`;
    fab.style.top = `${pos.top}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }
}

function getLocalFallbackPosition() {
  try {
    const raw = localStorage.getItem('autotype-viewport-pos');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Drag & drop logic for the FAB in viewport mode
function setupDraggability() {
  if (!fab) return;

  fab.addEventListener('mousedown', onMouseDown);
  fab.addEventListener('touchstart', onTouchStart, { passive: false });

  function onMouseDown(e) {
    if (currentPlacement !== 'viewport') return;
    if (e.button !== 0) return; // Left click only

    isDragging = true;
    dragThresholdPassed = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = fab.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragThresholdPassed) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dragThresholdPassed = true;
        fab.classList.add('dragging');
      }
    }

    if (dragThresholdPassed) {
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - fab.offsetWidth - 8;
      const maxTop = window.innerHeight - fab.offsetHeight - 8;

      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop = Math.max(8, Math.min(newTop, maxTop));

      fab.style.left = `${newLeft}px`;
      fab.style.top = `${newTop}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    fab.classList.remove('dragging');

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (dragThresholdPassed) {
      const pos = {
        left: parseFloat(fab.style.left),
        top: parseFloat(fab.style.top)
      };
      
      try {
        browser.storage.local.set({ viewportPosition: pos });
      } catch (err) {
        try {
          localStorage.setItem('autotype-viewport-pos', JSON.stringify(pos));
        } catch (e) {}
      }
    }
  }

  function onTouchStart(e) {
    if (currentPlacement !== 'viewport') return;
    if (e.touches.length !== 1) return;

    isDragging = true;
    dragThresholdPassed = false;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;

    const rect = fab.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!dragThresholdPassed) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dragThresholdPassed = true;
        fab.classList.add('dragging');
      }
    }

    if (dragThresholdPassed) {
      e.preventDefault(); // Stop scrolling gestures
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - fab.offsetWidth - 8;
      const maxTop = window.innerHeight - fab.offsetHeight - 8;

      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop = Math.max(8, Math.min(newTop, maxTop));

      fab.style.left = `${newLeft}px`;
      fab.style.top = `${newTop}px`;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  }

  function onTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    fab.classList.remove('dragging');

    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);

    if (dragThresholdPassed) {
      const pos = {
        left: parseFloat(fab.style.left),
        top: parseFloat(fab.style.top)
      };
      
      try {
        browser.storage.local.set({ viewportPosition: pos });
      } catch (err) {
        try {
          localStorage.setItem('autotype-viewport-pos', JSON.stringify(pos));
        } catch (e) {}
      }
    }
  }
}

// Create the FAB container and styles dynamically
function createFAB() {
  if (fab) return;

  const style = document.createElement('style');
  style.id = 'autotype-fab-styles';
  style.textContent = `
    #autotype-fab {
      position: fixed;
      width: 36px;
      height: 36px;
      padding: 0;
      background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
      color: white;
      border: none;
      border-radius: 18px;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(12px) scale(0.9);
      transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  border-radius 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.2s ease;
      pointer-events: none;
      user-select: none;
      overflow: hidden;
    }
    #autotype-fab.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    #autotype-fab.attached {
      cursor: pointer;
    }
    #autotype-fab.dragging {
      cursor: grabbing !important;
      opacity: 0.9;
      transform: scale(1.02);
      box-shadow: 0 8px 24px rgba(6, 182, 212, 0.6);
      transition: none !important;
    }
    #autotype-fab svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex-shrink: 0;
    }
    #autotype-fab span {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0;
      max-width: 0;
      transition: opacity 0.15s ease, max-width 0.15s ease, margin-left 0.15s ease;
      display: inline-block;
      overflow: hidden;
    }
    #autotype-fab:hover:not(.dragging) {
      width: 116px;
      justify-content: flex-start;
      padding-left: 12px;
      border-radius: 18px;
      box-shadow: 0 6px 16px rgba(6, 182, 212, 0.6);
    }
    #autotype-fab:hover:not(.dragging) span {
      opacity: 1;
      max-width: 70px;
      margin-left: 8px;
    }
    #autotype-fab:active {
      box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
    }
  `;
  document.head.appendChild(style);

  fab = document.createElement('button');
  fab.id = 'autotype-fab';
  
  fab.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" fill="currentColor" stroke="none" />
      <path d="M13 10l-3 4h3l-1 4 4-5h-3z" fill="currentColor" />
    </svg>
    <span>Auto-Type</span>
  `;

  fab.addEventListener('mousedown', (e) => {
    if (e.target !== fab && !fab.contains(e.target)) return;
    e.preventDefault(); // Retain input focus
  });

  fab.addEventListener('click', async (e) => {
    if (dragThresholdPassed) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const target = lastActiveElement || document.activeElement;
    if (target && isTextInput(target)) {
      target.focus();
      try {
        const response = await browser.runtime.sendMessage({ action: "readClipboard" });
        const text = response.text;
        
        if (text) {
          const settings = await browser.storage.local.get({
            typingDelay: 10,
            typingMode: "character"
          });
          performTyping(target, text, settings.typingDelay, settings.typingMode);
        } else {
          showFloatingFeedback("Clipboard is empty or blocked", "error");
        }
      } catch (err) {
        console.error("FAB click clipboard error:", err);
        showFloatingFeedback("Failed to access clipboard", "error");
      }
    }
  });

  setupDraggability();
  document.body.appendChild(fab);
}

function showFAB() {
  try {
    browser.storage.local.get({
      showFloatingButton: true,
      buttonPlacement: 'input'
    }).then(settings => {
      if (!settings || settings.showFloatingButton !== false) {
        currentPlacement = settings.buttonPlacement || 'input';
        createFAB();
        if (fab) {
          if (currentPlacement === 'input') {
            fab.classList.add('attached');
            const target = getDeepActiveElement();
            repositionAttachedFAB(target);
          } else {
            fab.classList.remove('attached');
            applyViewportPosition();
          }
          fab.classList.add('visible');
        }
      }
    }).catch(err => {
      console.warn("[AutoType] Storage showFAB query failed, using defaults:", err);
      createFAB();
      if (fab) {
        fab.classList.add('visible');
      }
    });
  } catch (err) {
    console.warn("[AutoType] Storage showFAB query threw error, using defaults:", err);
    createFAB();
    if (fab) {
      fab.classList.add('visible');
    }
  }
}

function hideFAB() {
  if (fab && !isDragging) {
    fab.classList.remove('visible');
  }
}

// Show a sleek user-facing floating notification toast on the page
function showFloatingFeedback(message, type = 'info') {
  let toast = document.getElementById('autotype-toast');
  if (toast) {
    toast.remove();
  }

  let style = document.getElementById('autotype-toast-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'autotype-toast-styles';
    style.textContent = `
      .autotype-toast {
        position: fixed;
        bottom: 80px;
        right: 24px;
        padding: 10px 18px;
        border-radius: 10px;
        color: white;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        opacity: 0;
        transform: translateY(12px) scale(0.95);
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .autotype-toast.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .toast-info {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      }
      .toast-success {
        background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      }
      .toast-error {
        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      }
    `;
    document.head.appendChild(style);
  }

  toast = document.createElement('div');
  toast.id = 'autotype-toast';
  toast.className = `autotype-toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('visible');
  }, 10);

  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.remove();
        }
      }, 250);
    }
  }, 2200);
}

// Listen for the Escape key to cancel active typing
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isTyping) {
    shouldStopTyping = true;
    showFloatingFeedback("Typing stopped", "error");
  }
}, true);

// Helper to simulate keydown/keypress/keyup events for typing realistic keystrokes
function dispatchKeyEvent(element, eventType, char) {
  const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
  const keyCode = char.charCodeAt(0);
  const event = new KeyboardEvent(eventType, {
    key: char,
    code: `Key${char.toUpperCase()}`,
    keyCode: keyCode,
    which: keyCode,
    shiftKey: isUpper,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

// Bypasses React wrapper setter restrictions and updates values safely
function insertTextAtCursor(element, text) {
  element.focus();
  
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    let success = false;
    try {
      success = document.execCommand('insertText', false, text);
    } catch (e) {
      success = false;
    }
    
    if (!success) {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      const val = element.value;
      const newVal = val.substring(0, start) + text + val.substring(end);
      
      const prototype = element instanceof HTMLTextAreaElement 
        ? HTMLTextAreaElement.prototype 
        : HTMLInputElement.prototype;
      const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      
      if (nativeValueSetter) {
        nativeValueSetter.call(element, newVal);
      } else {
        element.value = newVal;
      }
      
      element.selectionStart = element.selectionEnd = start + text.length;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else if (element.isContentEditable) {
    document.execCommand('insertText', false, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Main logic for character-by-character typing emulation
async function performTyping(element, text, delayMs, mode, randomizeDelay = false, randomizePercentage = 15) {
  if (isTyping) {
    shouldStopTyping = true;
    await new Promise(resolve => setTimeout(resolve, 60));
  }

  isTyping = true;
  shouldStopTyping = false;
  element.focus();

  showFloatingFeedback(mode === 'instant' ? "Pasting safely..." : "Typing...", "info");

  if (mode === 'instant' || delayMs === 0) {
    insertTextAtCursor(element, text);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    isTyping = false;
    showFloatingFeedback("Text injected", "success");
    return;
  }

  for (let i = 0; i < text.length; i++) {
    if (shouldStopTyping) {
      isTyping = false;
      return;
    }

    const char = text[i];
    
    dispatchKeyEvent(element, 'keydown', char);
    dispatchKeyEvent(element, 'keypress', char);

    insertTextAtCursor(element, char);

    dispatchKeyEvent(element, 'keyup', char);

    if (delayMs > 0 && i < text.length - 1) {
      const nextDelay = randomizeDelay
        ? getRandomizedDelay(delayMs, randomizePercentage)
        : delayMs;
      await new Promise(resolve => setTimeout(resolve, nextDelay));
    }
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
  isTyping = false;
  showFloatingFeedback("Finished typing", "success");
}

function getRandomizedDelay(baseDelay, percentage) {
  const variation = Math.round(baseDelay * (percentage / 100));
  const min = Math.max(0, baseDelay - variation);
  const max = baseDelay + variation;
  return Math.round(Math.random() * (max - min) + min);
}

// Message listener to handle paste requests or settings changes from commands or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "typeText") {
    const target = document.activeElement && isTextInput(document.activeElement)
      ? document.activeElement
      : lastActiveElement;

    if (target) {
      performTyping(
        target,
        message.text,
        message.delay,
        message.mode,
        message.randomizeDelay,
        message.randomizePercentage
      )
        .then(() => sendResponse({ success: true }))
        .catch(err => {
          console.error("Typing emulation failed:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    } else {
      showFloatingFeedback("Focus a text box to type clipboard", "error");
      sendResponse({ success: false, error: "No focused text box found." });
    }
  } else if (message.action === "updateSettings") {
    if (message.showFloatingButton !== undefined) {
      if (message.showFloatingButton) {
        const target = document.activeElement && isTextInput(document.activeElement)
          ? document.activeElement
          : lastActiveElement;
        if (target) {
          showFAB();
        }
      } else {
        hideFAB();
      }
    }
    
    if (message.buttonPlacement !== undefined) {
      currentPlacement = message.buttonPlacement;
      if (fab) {
        if (currentPlacement === 'input') {
          fab.classList.add('attached');
          const target = document.activeElement && isTextInput(document.activeElement)
            ? document.activeElement
            : lastActiveElement;
          repositionAttachedFAB(target);
        } else {
          fab.classList.remove('attached');
          applyViewportPosition();
        }
      }
    }
    sendResponse({ success: true });
  }
});
