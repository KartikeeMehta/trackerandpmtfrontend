(() => {
  // Wrap everything to avoid top-level identifier collisions when sandbox bundles multiple preloads
  const electron = require("electron");
  const cb = electron.contextBridge;
  const ir = electron.ipcRenderer;

  function safeOn(channel, handler) {
    try {
      ir.on(channel, (_event, payload) => {
        try {
          handler(payload);
        } catch (_) {}
      });
    } catch (_) {}
  }

  // Avoid exposing multiple times if the bundle executes twice
  if (!global.__TRACKER_PRELOAD_EXPOSED__) {
    try {
      cb.exposeInMainWorld("tracker", {
        onActivity(handler) {
          safeOn("tracker:activity", handler);
        },
        onIdleStart(handler) {
          safeOn("tracker:idle-start", handler);
        },
        onIdleEnd(handler) {
          safeOn("tracker:idle-end", handler);
        },
        onForcePunchOut(handler) {
          safeOn("tracker:force-punch-out", handler);
        },
        async getActivityCounts() {
          return await ir.invoke("get-activity-counts");
        },
        async resetActivityCounters() {
          return await ir.invoke("reset-activity-counters");
        },
        onCheckBreakStatus(handler) {
          safeOn("check-break-status", handler);
        },
        async checkBreakStatus(powerEvent) {
          return await ir.invoke("check-break-status", powerEvent);
        },
        async setStartup(enabled) {
          return await ir.invoke("set-startup", enabled);
        },
        async getStartupStatus() {
          return await ir.invoke("get-startup-status");
        },
        async toggleStartup() {
          return await ir.invoke("toggle-startup");
        },
      });
      global.__TRACKER_PRELOAD_EXPOSED__ = true;
    } catch (e) {
      // If another preload already exposed window.tracker, silently ignore
    }
  }
})();

// Removed duplicate exposure block to avoid collisions in packaged sandbox
