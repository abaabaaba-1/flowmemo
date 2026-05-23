/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.FLOWMEMO_TEST_URL || "http://localhost:3002";
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const ITINERARY_IMAGE = path.join(ROOT, "public", "demo", "pexels-izu-rocky-coast.jpg");

async function assertVisible(locator, label, timeout = 10000) {
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

async function run() {
  if (!fs.existsSync(ITINERARY_IMAGE)) {
    throw new Error(`Missing itinerary QA image: ${ITINERARY_IMAGE}`);
  }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await dismissCoverIfPresent(page);
    await assertVisible(page.getByText("请填写").first(), "onboarding title");
    await page.locator('input[type="file"]').first().setInputFiles(ITINERARY_IMAGE);
    await assertVisible(page.getByText(path.basename(ITINERARY_IMAGE)), "imported itinerary filename");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "pipeline-01-onboarding.png"), fullPage: true });

    await page.getByRole("button", { name: /开始记录/ }).click();
    await page.waitForURL("**/journey/demo-journey-izu", { timeout: 10000 });
    await assertVisible(page.getByText("Chat").first(), "chat tab");
    await assertVisible(page.getByRole("button", { name: "按住记笔记" }), "voice-first input");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "pipeline-02-chat-initial.png"), fullPage: true });

    const noteSuggestion = page.locator("button").filter({ hasText: /^记：/ }).first();
    await assertVisible(noteSuggestion, "note suggestion", 20000);
    await noteSuggestion.click();
    await assertVisible(page.getByText(/已写入 Pocket/).last(), "note saved confirmation", 30000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "pipeline-03-pocket-awake.png"), fullPage: true });

    await page.getByRole("button", { name: /Pocket/ }).click();
    await assertVisible(page.getByText(/Day 1/).first(), "timeline content");
    await assertVisible(page.getByText(/matched:/).first(), "matched timeline content", 15000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "pipeline-04-timeline.png"), fullPage: true });

    await page.getByRole("button", { name: /生成今日手账/ }).click();
    await page.waitForURL("**/daily-canvas/demo-journey-izu**", { timeout: 10000 });
    await assertVisible(page.getByText("今日画卷").first(), "scrapbook journal", 20000);
    await page
      .waitForFunction(() => !document.body.innerText.includes("正在把今天织成手账"), undefined, {
        timeout: 30000,
      })
      .catch(() => {});
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "pipeline-05-journal.png"), fullPage: true });
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
