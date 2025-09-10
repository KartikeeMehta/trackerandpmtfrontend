const {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  Tray,
  Menu,
  nativeImage,
  screen,
  systemPreferences,
  dialog,
} = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs");

// Ensure single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        // If for some reason the window isn't available, recreate it
        mainWindow = createWindow();
        mainWindow.show();
        mainWindow.focus();
      }
    } catch (_) {}
  });
}

function resolveIconPath() {
  const devIcon = path.join(__dirname, "public", "for_tray.png");
  const prodIcon = path.join(
    process.resourcesPath || __dirname,
    "public",
    "for_tray.png"
  );
  if (fs.existsSync(devIcon)) return devIcon;
  if (fs.existsSync(prodIcon)) return prodIcon;
  return devIcon;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 450,
    height: 650,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: resolveIconPath(),
  });

  try {
    Menu.setApplicationMenu(null);
    win.setMenuBarVisibility(false);
  } catch (_) {}

  // Load Parcel-built file during dev; load packaged renderer in prod
  const devUrl = process.env.ELECTRON_START_URL;
  if (!app.isPackaged && devUrl) {
    win.loadURL(devUrl);
  } else {
    const fileUrl = pathToFileURL(
      path.join(__dirname, "renderer", "index.html")
    ).toString();
    win.loadURL(fileUrl);
  }
  // Optional: open devtools in dev
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  return win;
}

let mainWindow = null;
let tray = null;
let isQuiting = false;

function sendForcePunchOut() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tracker:force-punch-out", {
        at: Date.now(),
      });
    }
  } catch (e) {}
}

async function gracefulQuit() {
  if (isQuiting) return;
  isQuiting = true;
  // Ask renderer to punch out
  sendForcePunchOut();
  // Give renderer a brief moment to finish network call
  await new Promise((resolve) => setTimeout(resolve, 1200));
  app.quit();
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  // Create system tray icon
  try {
    const iconPath = resolveIconPath();
    let image = nativeImage.createFromPath(iconPath);
    if (!image || (typeof image.isEmpty === "function" && image.isEmpty())) {
      image = nativeImage.createEmpty();
    }

    // Fixed 48x48 size for tray icon
    const trayImage = image.isEmpty
      ? image
      : image.resize({ width: 48, height: 48, quality: "best" });

    tray = new Tray(trayImage);
    tray.setToolTip("WorkOrbit Tracker");
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          gracefulQuit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {}

  // Intercept close -> hide to tray
  if (mainWindow) {
    mainWindow.on("close", (e) => {
      if (!isQuiting) {
        e.preventDefault();
        mainWindow.hide();
      }
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("before-quit", () => {
  // try to punch out once more if quit initiated elsewhere
  sendForcePunchOut();
  stopIdleMonitor();
});

// Handle system power events to force punch out
try {
  powerMonitor.on("shutdown", (e) => {
    try {
      // Attempt to punch out before OS shutdown
      sendForcePunchOut();
      // Delay shutdown very briefly to allow network call
      if (typeof e.preventDefault === "function") e.preventDefault();
      setTimeout(() => {
        app.quit();
      }, 800);
    } catch (_) {}
  });

  powerMonitor.on("suspend", () => {
    // Don't punch out on suspend if user is on break
    // User should remain on break even when computer goes to sleep
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("check-break-status", "suspend");
    }
  });

  powerMonitor.on("lock-screen", () => {
    // Don't punch out on lock if user is on break
    // User should remain on break even when computer is locked
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("check-break-status", "lock");
    }
  });
} catch (e) {}

app.on("window-all-closed", () => {
  // Keep app running in tray on Windows/Linux; macOS stays resident by default
  if (process.platform !== "darwin" && !tray) {
    app.quit();
  }
});

// Background idle detection using system idle time
let lastIdleState = false;
let idleInterval = null;
const IDLE_THRESHOLD_SECONDS = 30; // align with renderer threshold

// Track recent activity to filter out modifier-only activity
let recentActivity = [];
const ACTIVITY_WINDOW_MS = 2000; // 2 second window to check for real activity
let globalHookActive = false;
// Keep a strong reference to uIOhook so it doesn't get garbage-collected
let globalUiohookRef = null;

// Spam detection variables
let keyPressCounts = new Map(); // Track key press counts
const SPAM_THRESHOLD = 15; // Number of presses to consider spam
const SPAM_WINDOW_MS = 3000; // 3 second window to count key presses
const SPAM_RECOVERY_MS = 3000; // 3 seconds to wait after spam before resuming activity
let isSpamMode = false;
let spamRecoveryTimer = null;

// Activity counting variables
let totalKeystrokes = 0;
let totalMouseClicks = 0;
let spamKeystrokes = 0; // Track spam keystrokes separately

// Spam detection helper functions
function isSpamKey(keycode) {
  const now = Date.now();
  const keyData = keyPressCounts.get(keycode) || { count: 0, firstPress: now };

  // Reset count if outside spam window
  if (now - keyData.firstPress > SPAM_WINDOW_MS) {
    keyData.count = 1;
    keyData.firstPress = now;
  } else {
    keyData.count++;
  }

  keyPressCounts.set(keycode, keyData);

  console.log(
    `Key ${keycode} pressed ${keyData.count} times in ${
      now - keyData.firstPress
    }ms`
  );

  return keyData.count >= SPAM_THRESHOLD;
}

function enterSpamMode() {
  if (isSpamMode) return;

  console.log("🚫 SPAM DETECTED - Entering spam mode, starting idle time");
  isSpamMode = true;

  // Clear any existing recovery timer
  if (spamRecoveryTimer) {
    clearTimeout(spamRecoveryTimer);
  }

  // Send idle start event
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log("🚫 Sending spam idle start event to renderer");
    mainWindow.webContents.send("tracker:idle-start", {
      at: Date.now(),
      source: "spam-detection",
      reason: "key-spam",
    });
  } else {
    console.log("⚠️ Main window not available to send spam idle event");
  }
}

function exitSpamMode() {
  if (!isSpamMode) return;

  console.log("✅ Exiting spam mode after recovery period");
  isSpamMode = false;

  // Send idle end event
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log("✅ Sending spam idle end event to renderer");
    mainWindow.webContents.send("tracker:idle-end", {
      at: Date.now(),
      source: "spam-recovery",
    });
  } else {
    console.log("⚠️ Main window not available to send spam idle end event");
  }
}

function startSpamRecovery() {
  if (spamRecoveryTimer) {
    clearTimeout(spamRecoveryTimer);
  }

  console.log(`⏳ Starting spam recovery timer (${SPAM_RECOVERY_MS}ms)`);
  spamRecoveryTimer = setTimeout(() => {
    exitSpamMode();
  }, SPAM_RECOVERY_MS);
}

function resetActivityCounters() {
  totalKeystrokes = 0;
  totalMouseClicks = 0;
  spamKeystrokes = 0;
  keyPressCounts.clear();
  console.log("🔄 Activity counters reset");
}

function startIdleMonitor() {
  if (idleInterval) return;

  // Try to start global input hook for fine-grained filtering
  try {
    // On macOS, request/verify Accessibility permission before loading the hook
    if (process.platform === "darwin") {
      const trusted =
        typeof systemPreferences?.isTrustedAccessibilityClient === "function"
          ? systemPreferences.isTrustedAccessibilityClient(true)
          : true;
      if (!trusted) {
        console.log(
          "Accessibility permission not granted. Skipping uiohook startup on macOS."
        );
        try {
          dialog.showMessageBox({
            type: "info",
            message:
              "Please enable Accessibility and Input Monitoring for WorkOrbit in System Settings → Privacy & Security, then relaunch the app.",
            buttons: ["OK"],
          });
        } catch (_) {}
        throw new Error("macOS accessibility permission not granted");
      }
    }

    console.log("Attempting to load uiohook-napi...");
    const { uIOhook } = require("uiohook-napi");
    console.log("uiohook-napi loaded successfully!");
    // Keep global reference
    globalUiohookRef = uIOhook;

    // Count ALL keys; do not ignore modifiers or function keys
    const shouldCountKey = (_event) => {
      return true;
    };

    const markActivity = (meta) => {
      const now = Date.now();

      // If we're in spam mode, don't count this as activity
      if (isSpamMode) {
        console.log("🚫 Ignoring activity - in spam mode");
        return;
      }

      // Count legitimate activity
      if (meta && meta.keycode) {
        totalKeystrokes++;
        console.log(`📊 Total keystrokes: ${totalKeystrokes}`);
      } else {
        totalMouseClicks++;
        console.log(`📊 Total mouse clicks: ${totalMouseClicks}`);
      }

      recentActivity.push({ timestamp: now, source: "uiohook", ...meta });

      // Clean old activities
      recentActivity = recentActivity.filter(
        (activity) => now - activity.timestamp < ACTIVITY_WINDOW_MS
      );

      if (lastIdleState) {
        lastIdleState = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("tracker:idle-end", {
            at: Date.now(),
            source: "uiohook",
            ...meta,
          });
        }
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("tracker:activity", {
          at: Date.now(),
          source: "uiohook",
          keystrokes: totalKeystrokes,
          mouseClicks: totalMouseClicks,
          spamKeystrokes: spamKeystrokes,
          ...meta,
        });
      }
    };

    uIOhook.on("keydown", (e) => {
      console.log("Key pressed:", e.keycode);
      const shouldCount = shouldCountKey(e);
      if (shouldCount) {
        // Check for spam
        if (isSpamKey(e.keycode)) {
          spamKeystrokes++;
          console.log(
            `🚫 Spam keystroke detected! Total spam: ${spamKeystrokes}`
          );
          enterSpamMode();
          return; // Don't mark as activity
        }

        // If not spam, mark as normal activity
        markActivity({ keycode: e.keycode });
      }
    });

    uIOhook.on("keyup", (e) => {
      console.log("Key released:", e.keycode);
      const shouldCount = shouldCountKey(e);
      if (shouldCount && isSpamMode) {
        // User released a key while in spam mode, start recovery timer
        console.log(
          "🔑 Key released during spam mode, starting recovery timer"
        );
        startSpamRecovery();
      }
    });

    uIOhook.on("mousedown", () => {
      console.log("Mouse click detected");
      markActivity();
    });

    uIOhook.on("mousemove", () => {
      // ignore movement
    });

    uIOhook.on("wheel", () => {
      // ignore wheel
    });

    uIOhook.start();
    globalHookActive = true;
    console.log("Global input hook started successfully!");
  } catch (e) {
    console.log("Failed to start global input hook:", e.message);
    console.log("Falling back to powerMonitor-only mode");
  }

  // PowerMonitor handler with smart filtering
  try {
    powerMonitor.on("user-did-activity", () => {
      console.log(
        "powerMonitor user-did-activity fired, globalHookActive:",
        globalHookActive
      );

      const now = Date.now();
      recentActivity.push({ timestamp: now, source: "powerMonitor" });

      // Clean old activities
      recentActivity = recentActivity.filter(
        (activity) => now - activity.timestamp < ACTIVITY_WINDOW_MS
      );

      if (globalHookActive) {
        // When global hook is active, only end idle if we have recent real activity
        const hasRecentRealActivity = recentActivity.some(
          (activity) =>
            activity.source === "uiohook" &&
            activity.keycode &&
            activity.timestamp > now - 1000 // Within last 1 second
        );

        if (hasRecentRealActivity && lastIdleState) {
          lastIdleState = false;
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log(
              "Sending idle-end from powerMonitor (has real activity)"
            );
            mainWindow.webContents.send("tracker:idle-end", {
              at: Date.now(),
              source: "user-did-activity",
            });
          }
        } else {
          console.log(
            "Ignoring powerMonitor event - no real activity or not idle"
          );
        }
        return;
      }

      // Fallback when global hook is not available
      if (lastIdleState) {
        lastIdleState = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("tracker:idle-end", {
            at: Date.now(),
            source: "user-did-activity",
          });
        }
      }
    });
  } catch (e) {}
  idleInterval = setInterval(() => {
    try {
      const idleSecs = powerMonitor.getSystemIdleTime();
      const isIdle = idleSecs >= IDLE_THRESHOLD_SECONDS;
      if (isIdle !== lastIdleState) {
        lastIdleState = isIdle;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            isIdle ? "tracker:idle-start" : "tracker:idle-end",
            { idleSeconds: idleSecs, at: Date.now() }
          );
        }
      }
    } catch (e) {}
  }, 1000);
}

function stopIdleMonitor() {
  if (idleInterval) {
    clearInterval(idleInterval);
    idleInterval = null;
  }
}

// IPC handlers for activity tracking
ipcMain.handle("get-activity-counts", () => {
  return {
    keystrokes: totalKeystrokes,
    mouseClicks: totalMouseClicks,
    spamKeystrokes: spamKeystrokes,
  };
});

ipcMain.handle("reset-activity-counters", () => {
  resetActivityCounters();
  return { success: true };
});

// IPC handler to check break status and decide whether to punch out
ipcMain.handle("check-break-status", (event, powerEvent) => {
  // This will be called from the renderer process
  // The renderer will check if user is on break and respond accordingly
  return { powerEvent };
});

// Startup functionality
const setStartup = (enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true, // Start minimized to tray
      name: "WorkOrbit Tracker",
      path: process.execPath,
      args: ["--hidden"], // Start hidden
    });
    console.log(`Startup ${enabled ? "enabled" : "disabled"}`);
    return { success: true, enabled };
  } catch (error) {
    console.error("Error setting startup:", error);
    return { success: false, error: error.message };
  }
};

const getStartupStatus = () => {
  try {
    const settings = app.getLoginItemSettings();
    return {
      success: true,
      enabled: settings.openAtLogin,
      wasOpenedAtLogin: settings.wasOpenedAtLogin,
      wasOpenedAsHidden: settings.wasOpenedAsHidden,
    };
  } catch (error) {
    console.error("Error getting startup status:", error);
    return { success: false, error: error.message };
  }
};

// IPC handlers for startup management
ipcMain.handle("set-startup", (event, enabled) => {
  return setStartup(enabled);
});

ipcMain.handle("get-startup-status", () => {
  return getStartupStatus();
});

ipcMain.handle("toggle-startup", () => {
  const currentStatus = getStartupStatus();
  if (currentStatus.success) {
    return setStartup(!currentStatus.enabled);
  }
  return currentStatus;
});

app.whenReady().then(() => {
  startIdleMonitor();

  // Automatically enable startup - make it mandatory
  const startupResult = setStartup(true);
  if (startupResult.success) {
    console.log("Startup automatically enabled - app will start with system");
  }

  // Check if app was opened at login and start hidden if so
  const startupStatus = getStartupStatus();
  if (startupStatus.success && startupStatus.wasOpenedAtLogin) {
    console.log("App was opened at login, starting hidden");
    // Don't show window if opened at login, just create it for tray
    if (mainWindow) {
      mainWindow.hide();
    }
  }
});
