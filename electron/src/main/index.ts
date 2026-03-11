import { app, BrowserWindow } from "electron";
import { createWindow, setMainWindow } from "./window";
import { registerIpcHandlers } from "./ipcHandlers";

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
