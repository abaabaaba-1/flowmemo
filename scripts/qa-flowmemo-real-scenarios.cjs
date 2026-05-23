/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.FLOWMEMO_TEST_URL || "http://localhost:3001";
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts");

const assets = {
  itinerary: path.join(ROOT, "public", "demo", "pexels-izu-rocky-coast.jpg"),
  shinjukuRain: path.join(ROOT, "public", "demo", "pexels-shinjuku-rain.jpg"),
};

function ensureArtifacts() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const fileName = `qa-${name}.png`;
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, fileName),
    fullPage: true,
  });
  return fileName;
}

async function assertVisible(locator, label, timeout = 15000) {
  await locator.waitFor({ state: "visible", timeout }).catch((error) => {
    throw new Error(`Expected visible: ${label}\n${error.message}`);
  });
}

async function dismissCoverIfPresent(page) {
  await page
    .getByRole("button", { name: /开启旅程/ })
    .click({ timeout: 3000 })
    .catch(() => {});
}

async function waitForTextGone(page, text, timeout = 30000) {
  await page
    .waitForFunction((needle) => !document.body.innerText.includes(needle), text, { timeout })
    .catch(() => {});
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  ensureArtifacts();

  for (const [label, file] of Object.entries(assets)) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing QA asset ${label}: ${file}`);
    }
  }

  const report = {
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    scenarios: [],
    apiIssues: [],
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    artifacts: [],
  };

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  page.on("pageerror", (error) => {
    report.pageErrors.push(String(error.stack || error.message || error));
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      report.consoleErrors.push(message.text());
    }
  });
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/") && response.status() >= 400) {
      report.apiIssues.push({ url, status: response.status() });
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    if (
      failure?.errorText === "net::ERR_ABORTED" &&
      (request.url().includes("_rsc=") || request.url().includes("/api/ai/prompt-suggestions"))
    ) {
      return;
    }
    report.requestFailures.push({
      url: request.url(),
      resourceType: request.resourceType(),
      errorText: failure?.errorText ?? "unknown",
    });
  });

  async function scenario(name, fn) {
    const startedAt = Date.now();
    try {
      await fn();
      report.scenarios.push({ name, status: "passed", ms: Date.now() - startedAt });
    } catch (error) {
      const shot = `qa-failure-${report.scenarios.length + 1}.png`;
      await page.screenshot({ path: path.join(ARTIFACT_DIR, shot), fullPage: true }).catch(() => {});
      report.artifacts.push(shot);
      report.scenarios.push({
        name,
        status: "failed",
        ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  try {
    await scenario("Scenario 0: onboarding starts empty and validates required destination", async () => {
      await page.addInitScript(() => window.localStorage.clear());
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await dismissCoverIfPresent(page);
      await assertVisible(page.getByText("请填写").first(), "onboarding title");

      const destinationInput = page.locator("input:not([type])").first();
      assert((await destinationInput.inputValue()) === "", "new journeys should not prefill a demo destination");

      const dates = page.locator('input[type="date"]');
      const startDate = dates.nth(0);
      const endDate = dates.nth(1);
      const initialStartValue = await startDate.inputValue();
      const beforeStart = new Date(`${initialStartValue}T00:00:00`);
      beforeStart.setDate(beforeStart.getDate() - 1);
      const invalidEndValue = beforeStart.toISOString().slice(0, 10);

      await endDate.fill(invalidEndValue);
      await page.waitForTimeout(100);
      assert(
        (await endDate.inputValue()) === (await startDate.inputValue()),
        `return date was not corrected: ${await startDate.inputValue()} / ${await endDate.inputValue()}`
      );
      assert(
        (await endDate.getAttribute("min")) === (await startDate.inputValue()),
        "return date input should be constrained by the departure date"
      );

      await startDate.fill("2026-11-20");
      await page.waitForTimeout(100);
      assert((await startDate.inputValue()) === "2026-11-20", "departure date did not update");
      assert((await endDate.inputValue()) === "2026-11-20", "return date did not follow departure date");
      assert((await startDate.getAttribute("max")) === null, "departure date should not be constrained by return date");

      await page.getByRole("button", { name: /开始记录/ }).click();
      await assertVisible(page.getByText("请先补齐出行日期和目的地"), "missing destination toast", 5000);
      assert(!page.url().includes("/journey/"), `empty destination still navigated: ${page.url()}`);
      report.artifacts.push(await screenshot(page, "00-onboarding-guards"));
    });

    await scenario("Scenario 1: import itinerary screenshot and enter journey", async () => {
      await page.addInitScript(() => window.localStorage.clear());
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await dismissCoverIfPresent(page);
      await assertVisible(page.getByText("请填写").first(), "onboarding title");
      await page.locator('input[type="file"]').first().setInputFiles(assets.itinerary);
      await assertVisible(page.getByText(path.basename(assets.itinerary)), "imported itinerary filename");
      report.artifacts.push(await screenshot(page, "01-itinerary-import"));

      await page.getByRole("button", { name: /开始记录/ }).click();
      await page.waitForURL("**/journey/demo-journey-izu", { timeout: 12000 });
      await assertVisible(page.getByText("Chat").first(), "chat tab");
      await assertVisible(page.getByText("Pocket").first(), "pocket tab");
      await assertVisible(page.getByRole("button", { name: "按住记笔记" }), "voice-first input");
    });

    await scenario("Scenario 2: ask travel assistant and save a suggested note", async () => {
      await page.getByRole("button", { name: "键盘输入" }).click();
      await page.locator("textarea").fill("修善寺 11 月初适合穿什么衣服？");
      await page.getByRole("button", { name: "发送" }).click();
      await assertVisible(page.getByText(/薄外套|外套/).last(), "clothing advice response", 20000);

      const noteSuggestion = page.locator("button").filter({ hasText: /^记：/ }).first();
      await assertVisible(noteSuggestion, "note suggestion", 20000);
      await noteSuggestion.click();
      await assertVisible(page.getByText(/已写入 Pocket/).last(), "note saved confirmation", 30000);
      report.artifacts.push(await screenshot(page, "02-chat-plan-and-note"));
    });

    await scenario("Scenario 3: inspect Pocket timeline and import a real photo", async () => {
      await page.getByRole("button", { name: /Pocket/ }).click();
      await assertVisible(page.getByText(/Day 1/).first(), "timeline day title");

      await page.locator('input[type="file"]').first().setInputFiles(assets.shinjukuRain);
      await assertVisible(page.getByText("已导入 1 张照片"), "photo import toast", 30000);
      report.artifacts.push(await screenshot(page, "03-timeline-photo-import"));
    });

    await scenario("Scenario 4: save typed note from Pocket mode", async () => {
      await page.getByRole("button", { name: "键盘输入" }).click();
      await page
        .locator("textarea")
        .fill("刚刚在新宿雨夜撑伞穿过人群，霓虹和车灯全都落在地面上，像电影片尾。");
      await page.getByRole("button", { name: "保存笔记" }).click();
      await assertVisible(page.getByText(/已写入 Pocket/).last(), "typed note saved", 30000);
      await assertVisible(page.getByText(/新宿雨夜|霓虹/).last(), "typed note timeline text", 20000);
      report.artifacts.push(await screenshot(page, "04-typed-note"));
    });

    await scenario("Scenario 5: generate daily canvas with travel date and export image", async () => {
      await page.getByRole("button", { name: /生成今日手账/ }).click();
      await page.waitForURL("**/daily-canvas/demo-journey-izu**", { timeout: 12000 });
      await assertVisible(page.getByText("今日画卷").first(), "daily canvas page", 20000);
      await waitForTextGone(page, "正在听见今天的回响", 35000);

      const bodyText = await page.locator("body").innerText();
      const hasTravelDate = bodyText.includes("2026-11-08") || bodyText.includes("11月8日");
      assert(hasTravelDate, "daily canvas should use the trip travel date instead of the system date");
      assert(!bodyText.includes("5月24日"), "daily canvas copy should not use the system date");
      report.artifacts.push(await screenshot(page, "05-daily-canvas"));

      await page.getByRole("button", { name: "Vlog" }).click();
      await assertVisible(page.getByText(/Vlog|微电影|镜头/).first(), "vlog mode", 10000);
      await page.getByRole("button", { name: "手账", exact: true }).click();

      const downloadPromise = page.waitForEvent("download", { timeout: 45000 });
      await page.getByRole("button", { name: /导出画卷/ }).click();
      const download = await downloadPromise;
      const exportPath = path.join(ARTIFACT_DIR, "qa-export-flowmemo.jpg");
      await download.saveAs(exportPath);
      if (!fs.existsSync(exportPath) || fs.statSync(exportPath).size < 10_000) {
        throw new Error("Exported image is missing or too small");
      }
      report.artifacts.push("qa-export-flowmemo.jpg");
    });
  } finally {
    report.finishedAt = new Date().toISOString();
    report.failedScenarios = report.scenarios.filter((item) => item.status !== "passed");
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "qa-flowmemo-report.json"),
      JSON.stringify(report, null, 2)
    );
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
