# AutoType Clipboard Firefox Extension

A Lightweight Mozilla Firefox WebExtension designed to bypass copy/paste/right-click restrictions by emulating native user keyboard typing.

## Why This Extension Exists

Many banking and financial websites enforce strict input restrictions: they disable right‑click menus, block copy‑paste, and even prevent password managers from autofilling fields. Users are forced to manually type sensitive information such as passwords, account numbers, or verification codes that often already exist elsewhere on the screen or in a secure password manager. This leads to:

- **Increased error risk** – manual entry is prone to typos, especially with long account numbers.
- **Reduced productivity** – users must repeatedly re‑type data that could be copied.
- **Frustration** – security measures meant to protect users end up hindering legitimate workflows.

The AutoType Clipboard extension was created to address these pain points by safely emulating real keyboard typing, letting you paste data from the clipboard (or a password manager) while still complying with sites that block programmatic insertion. It provides a bridge between security restrictions and user convenience, without compromising the intended protection mechanisms.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Key Features

- **Keystroke Emulation:** Simulates actual keyboard events (`keydown`, `keypress`, `keyup`) for every character in the clipboard, tricking website validation scripts into thinking a real user is typing.
- **Bypasses Paste & Right-Click Blocks:** Bypasses pages that disable pasting or disable context menus entirely.
- **Framework Reactivity Integration:** Custom prototype setter hooks ensure changes are picked up by modern frameworks like **React**, **Vue**, **Angular**, and **Svelte** (which standard programmatic inserts often break).
- **Expandable Icon Button:** The floating button renders as a tiny, non-obtrusive `36px` circle with a clean lightning-bolt clipboard icon by default. On hover, it smoothly morphs into a pill-shaped button displaying the text `"Auto-Type"`.
- **Adjustable Button Placement:** Position the floating helper button based on your preferences (controlled in the popup settings):
  - **Near Input (Default):** The button anchors adjacent to the focused text input and tracks scroll/resize operations automatically.
  - **Viewport (Draggable):** The button floats freely on the screen. It can be dragged and dropped anywhere (mouse or touch gestures) and saves its coordinates globally to persist across pages, reloads, and sessions.
- **Adjustable Typing Speed:** Choose between natural simulated typing (adjustable from 0ms to 150ms per key) or Instant mode.
- **Typing Variation / Randomization:** Add human-like randomness to delay timing for each keystroke, with a slider control that varies the base delay by up to 99% for more realistic typing patterns.
- **Active Cancellation:** Hit the `Escape` key at any point to immediately halt active auto-typing.
- **Global Keyboard Shortcut:** Use the global command shortcut:
  - **Windows / Linux:** <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd>
  - **macOS:** <kbd>Command</kbd> + <kbd>Option</kbd> + <kbd>K</kbd>
- **Built-in Testing Panel:** Easily test speeds and modes using the test field in the settings popup itself.

---

## How to Test and Use

### 1. Test Locally Inside the Popup
- Click the extension icon in the Firefox toolbar.
- Focus the text box under **"Test Field"** at the bottom of the popup.
- Use the **Run Test** button to emulate typing the clipboard text directly into the test textarea.
- The **Clear** button clears both the test textarea and the delay log.
- When Randomization is enabled, each keystroke delay is randomized based on the slider setting.

### 2. Auto-type on any Webpage
- Open any website and focus a text input.
- **Near Input Placement (Default)**: The small circular button will automatically slide in right next to the focused text box.
- **Viewport Placement**: Toggle this option in the extension popup. A circular button will float on the screen. Drag it with your mouse/finger to place it anywhere you like.
- Click the floating button, or press the global hotkey (**<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>** / **<kbd>⌘</kbd>+<kbd>⌥</kbd>+<kbd>K</kbd>**).
- Press <kbd>Esc</kbd> at any time if you need to abort typing.

