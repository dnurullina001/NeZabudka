import { app, BrowserWindow, shell, dialog } from "electron";
import path from "path";
import http from "http";
import net from "net";
import { createServer } from "./server";
/** Находит свободный порт автоматически — нет конфликтов */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}
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
function waitForServer(port: number, retries = 50): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/healthz`, (res) => {
        if (res.statusCode === 200) resolve();
        else tryAgain();
      });
      req.on("error", tryAgain);
    };
    const tryAgain = () => {
      attempts++;
      if (attempts >= retries) {
        reject(new Error(`Сервер не запустился после ${retries} попыток`));
        return;
      }
      setTimeout(check, 300);
    };
    check();
  });
}
async function createWindow() {
  try {
    const dbPath = getDbPath();
    const rendererPath = getRendererPath();
    const wasmPath = getWasmPath();
    const PORT = await getFreePort();
    const expressApp = await createServer(dbPath, rendererPath, wasmPath);
    const server = http.createServer(expressApp);
    await new Promise<void>((resolve, reject) => {
      server.on("error", (err) => reject(err));
      server.listen(PORT, "127.0.0.1", () => resolve());
    });
    await waitForServer(PORT);
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: "НеЗабудка",
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
    win.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    dialog.showErrorBox(
      "НеЗабудка — ошибка запуска",
      `Не удалось запустить приложение:\n\n${err instanceof Error ? err.message : String(err)}\n\nПопробуйте перезапустить приложение.`
    );
    app.quit();
  }
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
