const path = require("path");

const repoRoot = __dirname;
const backendPort = 8100;
const frontendPort = 3100;
const isWindows = process.platform === "win32";
const backendPython = isWindows
  ? path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe")
  : path.join(repoRoot, "backend", ".venv", "bin", "python");

const frontendCommand = isWindows
  ? `cmd /c "set NEXT_PUBLIC_API_BASE_URL=http://localhost:${backendPort}&& npm run build && npm run start -- --hostname localhost --port ${frontendPort}"`
  : `sh -c 'NEXT_PUBLIC_API_BASE_URL=http://localhost:${backendPort} npm run build && npm run start -- --hostname localhost --port ${frontendPort}'`;

module.exports = {
  testDir: path.join(repoRoot, "frontend", "e2e"),
  timeout: 600_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1100 },
    ignoreHTTPSErrors: true,
    reducedMotion: "reduce",
  },
  webServer: [
    {
      command: `"${backendPython}" -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: path.join(repoRoot, "backend"),
      url: `http://127.0.0.1:${backendPort}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: frontendCommand,
      cwd: path.join(repoRoot, "frontend"),
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
};
