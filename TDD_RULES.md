# ADB Command Deck - Test-Driven Development Rules

## Build Targets

| Platform | Architecture | Output |
|----------|--------------|--------|
| macOS | Universal (x86_64 + arm64) | `.dmg` |
| macOS | Intel | `.dmg` |
| macOS | Apple Silicon | `.dmg` |
| Windows | x86_64 | `.msi` |
| Linux | x86_64 | `.AppImage` / `.deb` |

---

## Feature Test Procedures

### 1. Console Command Execution

**Test Case 1.1: Basic shell command via `{{adb}}` prefix**
- Connect to a device (e.g., `192.168.0.128:5555`)
- Enter: `{{adb}} shell getprop ro.build.version.sdk`
- Expected: Command resolves to `adb -s 192.168.0.128:5555 shell getprop ro.build.version.sdk`
- Expected: Output displays in console (e.g., `31`)

**Test Case 1.2: Bare device command auto-routing**
- Enter: `shell getprop ro.build.version.sdk`
- Expected: Command auto-resolves to `adb -s 192.168.0.128:5555 shell getprop ro.build.version.sdk`

**Test Case 1.3: Non-device commands (e.g., `ping`)**
- Enter: `ping -c 3 8.8.8.8`
- Expected: Runs locally, output shows in console

**Test Case 1.4: Server commands bypass auto-routing**
- Enter: `adb devices`
- Enter: `adb kill-server`
- Expected: No `-s <device>` appended

**Test Case 1.5: Placeholder substitution**
- Enter: `{{ip}}`
- Expected: Replaced with device IP
- Enter: `{{port}}`
- Expected: Replaced with device port
- Enter: `{{package}}`
- Expected: Replaced with configured package name
- Enter: `{{activity_name}}`
- Expected: Replaced with configured activity name

---

### 2. Kill/Abort Button

**Test Case 2.1: Kill button appears during command execution**
- Run a long-running command (e.g., `ping -c 100 8.8.8.8`)
- Expected: "Kill" button (red, variant="error") replaces "Run" button immediately

**Test Case 2.2: Kill button terminates command**
- Click "Kill" button while command is running
- Expected: Command process is terminated
- Expected: Console shows warning: "Command abort requested..."

---

### 3. Command History

**Test Case 3.1: History stores up to 7 commands**
- Execute 7 different commands
- Expected: All 7 stored in history

**Test Case 3.2: History capped at 7 (FIFO)**
- Execute 8 commands
- Expected: Oldest command is dropped, newest 7 remain

**Test Case 3.3: Arrow up recalls previous command**
- Focus on command input
- Press Arrow Up
- Expected: Last executed command appears in input

**Test Case 3.4: Arrow down navigates forward through history**
- Press Arrow Up multiple times to go back
- Press Arrow Down
- Expected: Moves forward in history

**Test Case 3.5: Delete single command from history**
- Click history toggle (▼) button
- Click × on a command entry
- Expected: That command is removed from history

**Test Case 3.6: History dropdown closes on Escape**
- Open history dropdown
- Press Escape
- Expected: Dropdown closes

---

### 4. Error Display

**Test Case 4.1: Command errors appear in console log**
- Disconnect device
- Try to run: `adb -s 192.168.0.128:5555 shell ls`
- Expected: Error message appears in console with level "error" (red "ERR" tag)

**Test Case 4.2: Connection errors show specific messages**
- Attempt to connect to unreachable IP
- Expected: Specific error shown (e.g., "Connection refused", "No route to host", "timeout")

---

### 5. Device Connection

**Test Case 5.1: Connection sequence**
- Enter IP and port
- Click Connect
- Expected: `adb kill-server` → `adb start-server` → `adb disconnect` → `adb connect` sequence runs

**Test Case 5.2: Connection timeout**
- Attempt connection that cannot succeed within 5 seconds
- Expected: "Connection timed out after 5 seconds" error

---

### 6. Splash Screen / Initialization

**Test Case 6.1: Navigation disabled during initialization**
- App is starting / initializing
- Click on sidebar navigation items (Main Dashboard, Console, Settings)
- Expected: Content does NOT change while `isInitializing` is true

**Test Case 6.2: Loading indicator shown during initialization**
- Expected: "Loading..." feedback visible until initialization complete

---

### 7. Autocomplete/Autocorrect Disabled

**Test Case 7.1: No autocomplete on console input**
- Focus console command input
- Type partial command
- Expected: Browser does NOT show autocomplete dropdown

**Test Case 7.2: No autocorrect on console input**
- Type "hello" as command
- Expected: No red underline (autocorrect disabled)

**Test Case 7.3: No spellcheck on console input**
- Expected: All inputs have `spellCheck={false}`

---

### 8. Universal Build (macOS)

**Test Case 8.1: DMG works on Intel Mac**
- Share DMG to Intel Mac user
- Expected: DMG opens and app launches

**Test Case 8.2: DMG works on Apple Silicon Mac**
- Share DMG to M1/M2/M3 Mac user
- Expected: DMG opens and app launches

---

## Running Tests

```bash
# Development mode
npm run tauri dev

# Production build
npm run tauri build

# Run specific platform build
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target aarch64-apple-darwin
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## Pre-commit Checklist

- [ ] Console command execution works with `{{adb}}` prefix
- [ ] Console command auto-routing works (bare `shell`, `pm`, etc.)
- [ ] Kill button appears and aborts running command
- [ ] Command history stores max 7 commands
- [ ] History delete button removes individual commands
- [ ] Arrow keys navigate command history
- [ ] Errors display in console (not just tooltips)
- [ ] Placeholder substitution works (`{{ip}}`, `{{port}}`, `{{package}}`, `{{activity_name}}`)
- [ ] Navigation disabled during splash initialization
- [ ] No autocomplete/autocorrect on any text input
- [ ] Universal macOS DMG builds successfully
- [ ] CI passes on GitHub Actions
