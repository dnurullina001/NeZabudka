import { app, BrowserWindow, shell } from "electron";
import path from "path";
import http from "http";
import { createServer } from "./server";

const PORT = 58234;

function getDbPath(): string {
  return path.join(app.getPath("userData"), "notes.db");
}

function getRendererPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "renderer");
  }
  return path.join(__dirname, "renderer");
}

function getWasmPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "sql-wasm.wasm");
  }
  return path.join(__dirname, "sql-wasm.wasm");
}

function waitForServer(port: number, retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://localhost:${port}/api/healthz`, (res) => {
        if (res.statusCode === 200) resolve();
        else tryAgain();
      });
      req.on("error", tryAgain);
    };
    const tryAgain = () => {
      attempts++;
      if (attempts >= retries) { reject(new Error("Server did not start")); return; }
      setTimeout(check, 300);
    };
    check();
  });
}

async function createWindow() {
  const dbPath = getDbPath();
  const rendererPath = getRendererPath();
  const wasmPath = getWasmPath();

  const expressApp = await createServer(dbPath, rendererPath, wasmPath);
  const server = http.createServer(expressApp);
  server.listen(PORT);

  await waitForServer(PORT);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Умные заметки",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
