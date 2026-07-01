const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { runTests } = require("@vscode/test-electron");

const REEXEC_ENV_FLAG = "FILELINE_LINKS_UNDER_XVFB";

// VS Code's Electron test host renders a real window, so on Linux it needs an
// X server. Windows and macOS launch their own native compositor and never
// hit this path, so this only changes behavior on headless Linux.
function needsVirtualDisplay() {
  return process.platform === "linux"
    && !process.env.DISPLAY
    && !process.env.WAYLAND_DISPLAY
    && !process.env[REEXEC_ENV_FLAG];
}

function hasCommand(command) {
  return spawnSync(command, ["--help"], { stdio: "ignore" }).error === undefined;
}

function reexecUnderXvfb() {
  console.log("No X server detected on Linux; relaunching the VS Code test host under xvfb-run.");
  const result = spawnSync(
    "xvfb-run",
    ["--auto-servernum", "--server-args=-screen 0 1280x1024x24", process.execPath, __filename],
    {
      stdio: "inherit",
      env: { ...process.env, [REEXEC_ENV_FLAG]: "1" }
    }
  );
  process.exit(result.status ?? 1);
}

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "./suite/index");

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      extensionDevelopmentPath,
      "--disable-extensions"
    ]
  });
}

if (needsVirtualDisplay()) {
  if (!hasCommand("xvfb-run")) {
    console.error(
      "No X server ($DISPLAY) is available and 'xvfb-run' was not found on PATH.\n"
      + "VS Code's test host needs a display to run on Linux. Install it with:\n"
      + "  Debian/Ubuntu: sudo apt-get install xvfb\n"
      + "  Fedora/RHEL:   sudo dnf install xorg-x11-server-Xvfb\n"
      + "  Arch:          sudo pacman -S xorg-server-xvfb\n"
      + "then re-run 'npm run test:vscode'."
    );
    process.exit(1);
  }
  reexecUnderXvfb();
} else {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

