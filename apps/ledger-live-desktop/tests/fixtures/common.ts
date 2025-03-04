import {
  test as base,
  Page,
  ElectronApplication,
  _electron as electron,
  ChromiumBrowserContext,
} from "@playwright/test";
import * as fs from "fs";
import fsPromises from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { OptionalFeatureMap } from "@ledgerhq/types-live";
import { responseLogfilePath } from "../utils/networkResponseLogger";
import { getEnv, setEnv } from "@ledgerhq/live-env";
import { startSpeculos, stopSpeculos } from "../utils/speculos";
import { Spec } from "../utils/speculos";

import { allure } from "allure-playwright";

export function generateUUID(): string {
  return crypto.randomBytes(16).toString("hex");
}

function appendFileErrorHandler(e: Error | null) {
  if (e) console.error("couldn't append file", e);
}

type TestFixtures = {
  lang: string;
  theme: "light" | "dark" | "no-preference" | undefined;
  speculosCurrency: Spec;
  speculosOffset: number;
  testName: string;
  userdata: string;
  userdataDestinationPath: string;
  userdataOriginalFile: string;
  userdataFile: string;
  env: Record<string, string>;
  electronApp: ElectronApplication;
  page: Page;
  featureFlags: OptionalFeatureMap;
  recordTestNamesForApiResponseLogging: void;
  simulateCamera: string;
};

const IS_NOT_MOCK = process.env.MOCK == "0";
const IS_DEBUG_MODE = !!process.env.PWDEBUG;
if (IS_NOT_MOCK) setEnv("DISABLE_APP_VERSION_REQUIREMENTS", true);

export const test = base.extend<TestFixtures>({
  env: undefined,
  lang: "en-US",
  theme: "dark",
  userdata: undefined,
  featureFlags: undefined,
  simulateCamera: undefined,
  speculosCurrency: undefined,
  speculosOffset: undefined,
  testName: undefined,
  userdataDestinationPath: async ({}, use) => {
    use(path.join(__dirname, "../artifacts/userdata", generateUUID()));
  },
  userdataOriginalFile: async ({ userdata }, use) => {
    use(path.join(__dirname, "../userdata/", `${userdata}.json`));
  },
  userdataFile: async ({ userdataDestinationPath }, use) => {
    const fullFilePath = path.join(userdataDestinationPath, "app.json");
    use(fullFilePath);
  },
  electronApp: async (
    {
      lang,
      theme,
      userdata,
      userdataDestinationPath,
      userdataOriginalFile,
      env,
      featureFlags,
      simulateCamera,
      speculosCurrency,
      speculosOffset,
      testName,
    },
    use,
  ) => {
    // create userdata path
    await fsPromises.mkdir(userdataDestinationPath, { recursive: true });

    if (userdata) {
      await fsPromises.copyFile(userdataOriginalFile, `${userdataDestinationPath}/app.json`);
    }

    let device: any | undefined;
    if (IS_NOT_MOCK) {
      if (speculosCurrency) {
        setEnv(
          "SPECULOS_PID_OFFSET",
          speculosOffset * 1000 + parseInt(process.env.TEST_WORKER_INDEX || "0") * 100,
        );
        device = await startSpeculos(testName, speculosCurrency);
        setEnv("SPECULOS_API_PORT", device?.ports.apiPort?.toString());
      }
    }

    try {
      // default environment variables
      env = Object.assign(
        {
          ...process.env,
          VERBOSE: true,
          MOCK: IS_NOT_MOCK ? undefined : true,
          MOCK_COUNTERVALUES: true,
          HIDE_DEBUG_MOCK: true,
          CI: process.env.CI || undefined,
          PLAYWRIGHT_RUN: true,
          CRASH_ON_INTERNAL_CRASH: true,
          LEDGER_MIN_HEIGHT: 768,
          FEATURE_FLAGS: JSON.stringify(featureFlags),
          MANAGER_DEV_MODE: IS_NOT_MOCK ? true : undefined,
          SPECULOS_API_PORT: IS_NOT_MOCK ? getEnv("SPECULOS_API_PORT")?.toString() : undefined,
          DISABLE_TRANSACTION_BROADCAST:
            process.env.ENABLE_TRANSACTION_BROADCAST == "1" || !IS_NOT_MOCK ? undefined : 1,
        },
        env,
      );

      // launch app
      const windowSize = { width: 1024, height: 768 };

      const electronApp: ElectronApplication = await launchApp({
        env,
        lang,
        theme,
        userdataDestinationPath,
        simulateCamera,
        windowSize,
      });

      await use(electronApp);

      // close app
      await electronApp.close();
    } finally {
      if (device) {
        await stopSpeculos(device);
      }
    }
  },
  page: async ({ electronApp }, use, testInfo) => {
    // app is ready
    const page = await electronApp.firstWindow();
    // we need to give enough time for the playwright app to start. when the CI is slow, 30s was apprently not enough.
    page.setDefaultTimeout(99000);

    if (process.env.PLAYWRIGHT_CPU_THROTTLING_RATE) {
      const client = await (page.context() as ChromiumBrowserContext).newCDPSession(page);
      await client.send("Emulation.setCPUThrottlingRate", {
        rate: parseInt(process.env.PLAYWRIGHT_CPU_THROTTLING_RATE),
      });
    }

    // record all logs into an artifact
    const logFile = testInfo.outputPath("logs.log");
    page.on("console", msg => {
      const txt = msg.text();
      if (msg.type() == "error") {
        console.error(txt);
      }
      if (IS_DEBUG_MODE) {
        // Direct Electron console to Node terminal.
        console.log(txt);
      }
      fs.appendFile(logFile, `${txt}\n`, appendFileErrorHandler);
    });

    // start recording all network responses in artifacts/networkResponse.log
    await page.route("**/*", async route => {
      const now = Date.now();
      const timestamp = new Date(now).toISOString();

      const headers = route.request().headers();

      if (headers.teststatus && headers.teststatus === "mocked") {
        fs.appendFile(
          responseLogfilePath,
          `[${timestamp}] MOCKED RESPONSE: ${route.request().url()}\n`,
          appendFileErrorHandler,
        );
      } else {
        fs.appendFile(
          responseLogfilePath,
          `[${timestamp}] REAL RESPONSE: ${route.request().url()}\n`,
          appendFileErrorHandler,
        );
      }
      await route.continue();
    });

    // app is loaded
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#loader-container", { state: "hidden" });

    // use page in the test
    await use(page);

    console.log(`Video for test recorded at: ${await page.video()?.path()}\n`);
  },

  // below is used for the logging file at `artifacts/networkResponses.log`
  recordTestNamesForApiResponseLogging: [
    async ({}, use, testInfo) => {
      fs.appendFile(
        responseLogfilePath,
        `Network call responses for test: '${testInfo.title}':\n`,
        appendFileErrorHandler,
      );

      await use();

      fs.appendFile(responseLogfilePath, `\n`, appendFileErrorHandler);
    },
    { auto: true },
  ],
});

export async function launchApp({
  env,
  lang,
  theme,
  userdataDestinationPath,
  simulateCamera,
  windowSize,
}: {
  env: Record<string, string>;
  lang: string;
  theme: "light" | "dark" | "no-preference" | undefined;
  userdataDestinationPath: string;
  simulateCamera?: string;
  windowSize: { width: number; height: number };
}): Promise<ElectronApplication> {
  return await electron.launch({
    args: [
      `${path.join(__dirname, "../../.webpack/main.bundle.js")}`,
      `--user-data-dir=${userdataDestinationPath}`,
      // `--window-size=${window.width},${window.height}`, // FIXME: Doesn't work, window size can't be forced?
      "--force-device-scale-factor=1",
      "--disable-dev-shm-usage",
      // "--use-gl=swiftshader"
      "--no-sandbox",
      "--enable-logging",
      ...(simulateCamera
        ? [
            "--use-fake-device-for-media-stream",
            `--use-file-for-fake-video-capture=${simulateCamera}`,
          ]
        : []),
    ],
    recordVideo: {
      dir: `${path.join(__dirname, "../artifacts/videos/")}`,
      size: windowSize, // FIXME: no default value, it could come from viewport property in conf file but it's not the case
    },
    env,
    colorScheme: theme,
    locale: lang,
    executablePath: require("electron/index.js"),
    timeout: 120000,
  });
}

export async function addTmsLink(ids: string[]) {
  for (const id of ids) {
    await allure.tms(id, `https://ledgerhq.atlassian.net/browse/${id}`);
  }
}

export default test;
