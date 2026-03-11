import path from "path";
import fs from "fs";
import { app, BrowserWindow, shell } from "electron";
import { fetchOnboardSchema } from "./fetchSchema";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

export function createWindow(): BrowserWindow {
  const iconPath = path.join(__dirname, "../../build/icon.png");
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    resizable: false,
    frame: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0c0a12",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "OpenClaw 安装助手",
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.once("did-finish-load", () => {
    const schema = fetchOnboardSchema();
    win.webContents.send("onboard-schema", schema);
    setTimeout(() => win.webContents.send("onboard-schema", schema), 500);
  });

  mainWindow = win;
  win.on("closed", () => { mainWindow = null; });
  return win;
}

export function pushOnboardSchema(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const schema = fetchOnboardSchema();
    mainWindow.webContents.send("onboard-schema", schema);
  }
}
