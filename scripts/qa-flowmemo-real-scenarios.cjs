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
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `qa-${name}.png`),
    fullPage: true,
  });
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
    if (failure?.errorText === "net::ERR_ABORTED" && request.url().includes("_rsc=")) {
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
    await scenario("场景 0：启程页日期顺序和必填校验", async () => {
      await page.addInitScript(() => window.localStorage.clear());
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await dismissCoverIfPresent(page);
      await assertVisible(page.getByText("请填写").first(), "onboarding title");

      const dates = page.locator('input[type="date"]');
      const startDate = dates.nth(0);
      const endDate = dates.nth(1);

      await endDate.fill("2026-11-01");
      await page.waitForTimeout(100);
      assert(
        (await endDate.inputValue()) === (await startDate.inputValue()),
        `返程未自动纠正：${await startDate.inputValue()} / ${await endDate.inputValue()}`
      );
      assert(
        (await endDate.getAttribute("min")) === (await startDate.inputValue()),
        "返程日期控件缺少 min=去程 约束"
      );

      await startDate.fill("2026-11-20");
      await page.waitForTimeout(100);
      assert((await startDate.inputValue()) === "2026-11-20", "去程整体后移失败");
      assert((await endDate.inputValue()) === "2026-11-20", "返程没有跟随去程后移");
      assert((await startDate.getAttribute("max")) === null, "去程不应被返程 max 卡住");

      await page.locator("input:not([type])").first().fill("");
      await page.getByRole("button", { name: /开始记录/ }).click();
      await assertVisible(page.getByText("请先补齐出行日期和目的地"), "missing destination toast", 5000);
      assert(!page.url().includes("/journey/"), `空目的地仍然跳转：${page.url()}`);
      await screenshot(page, "00-onboarding-guards");
      report.artifacts.push("qa-00-onboarding-guards.png");
    });

    await scenario("场景 1：导入行程截图并进入旅程", async () => {
      await page.addInitScript(() => window.localStorage.clear());
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await dismissCoverIfPresent(page);
      await assertVisible(page.getByText("请填写").first(), "onboarding title");
      await page.locator('input[type="file"]').first().setInputFiles(assets.itinerary);
      await assertVisible(page.getByText(path.basename(assets.itinerary)), "imported itinerary filename");
      await screenshot(page, "01-itinerary-import");
      report.artifacts.push("qa-01-itinerary-import.png");

      await page.getByRole("button", { name: /开始记录/ }).click();
      await page.waitForURL("**/journey/demo-journey-izu", { timeout: 12000 });
      await assertVisible(page.getByText("聊天"), "chat tab");
      await assertVisible(page.getByRole("button", { name: /按住/ }), "voice-first input");
    });

    await scenario("场景 2：键盘咨询旅行计划，AI 返回可执行建议", async () => {
      await page.getByRole("button", { name: "键盘输入" }).click();
      await page.locator("textarea").fill("修善寺 11 月初适合穿什么衣服？");
      await page.getByRole("button", { name: "发送" }).click();
      await assertVisible(page.getByText("薄外套"), "clothing advice response", 20000);
      await screenshot(page, "02-chat-plan");
      report.artifacts.push("qa-02-chat-plan.png");
    });

    await scenario("场景 3：记录旅行碎片并检查照片池匹配", async () => {
      await page.getByRole("button", { name: "筑地早餐" }).click();
      await assertVisible(page.getByRole("button", { name: /智能锦囊/ }), "smart pocket trigger", 20000);
      await assertVisible(page.getByText(/已写入.*Pocket/), "note saved assistant confirmation", 20000);
      await page.getByRole("button", { name: /Pocket/ }).click();
      await assertVisible(page.locator("h2", { hasText: /今日 Pocket/ }), "timeline title");
      await assertVisible(page.getByText("已从照片池匹配").first(), "matched photo label", 15000);
      await screenshot(page, "03-timeline-matched");
      report.artifacts.push("qa-03-timeline-matched.png");
    });

    await scenario("场景 4：导入相册照片，再补一条文本笔记", async () => {
      await page.locator('main section input[type="file"]').first().setInputFiles(assets.shinjukuRain);
      await assertVisible(page.getByText("已导入 1 张照片"), "photo import toast", 30000);
      await assertVisible(page.locator("p", { hasText: /AI 已识别/ }).first(), "photo ai analysis status", 30000);
      await assertVisible(page.getByText("13 张候选照片"), "photo pool count updated", 10000);

      await page.getByRole("button", { name: "聊天" }).click();
      await page.getByRole("button", { name: "键盘输入" }).click();
      await page.getByRole("button", { name: "记笔记", exact: true }).click();
      await page
        .locator("textarea")
        .fill("刚刚在新宿雨夜撑伞穿过人群，霓虹和车灯全都落在地面上，像电影片尾。");
      await page.getByRole("button", { name: "保存笔记" }).click();
      await assertVisible(page.getByText(/已写入.*Pocket/).last(), "second note saved", 20000);
      await page.getByRole("button", { name: /Pocket/ }).click();
      await assertVisible(page.getByText(/Moment 2/), "second timeline moment", 20000);
      await screenshot(page, "04-upload-and-second-note");
      report.artifacts.push("qa-04-upload-and-second-note.png");
    });

    await scenario("场景 5：上传新照片后自动给已有笔记重新配图", async () => {
      await page.getByRole("button", { name: "聊天" }).click();
      await page.getByRole("button", { name: "键盘输入" }).click();
      await page.getByRole("button", { name: "记笔记", exact: true }).click();
      await page
        .locator("textarea")
        .fill("golden match newonly：刚刚路过一个只有我注意到的小角落，想先记下来，等会儿再补照片。");
      await page.getByRole("button", { name: "保存笔记" }).click();
      await assertVisible(page.getByText(/已写入.*Pocket/).last(), "pre-photo note saved", 20000);

      await page.getByRole("button", { name: /Pocket/ }).click();
      const uniquePhoto = {
        name: "golden-match-newonly.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync(assets.shinjukuRain),
      };
      await page.locator('main section input[type="file"]').first().setInputFiles(uniquePhoto);
      await assertVisible(page.getByText("golden-match-newonly").first(), "rematched photo label", 30000);
      await screenshot(page, "05-auto-rematch-existing-note");
      report.artifacts.push("qa-05-auto-rematch-existing-note.png");
    });

    await scenario("场景 6：生成今日画卷、切换 Vlog、导出图片", async () => {
      await page.getByRole("button", { name: /生成今日手账/ }).click();
      await page.waitForURL("**/daily-canvas/demo-journey-izu**", { timeout: 12000 });
      await assertVisible(page.getByText("今日画卷").first(), "daily canvas page", 20000);
      await waitForTextGone(page, "正在把今天织成手账", 35000);
      await screenshot(page, "06-daily-canvas");
      report.artifacts.push("qa-06-daily-canvas.png");

      await page.getByRole("button", { name: "Vlog" }).click();
      await assertVisible(page.getByText("宽屏微电影手记"), "vlog mode", 10000);
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
