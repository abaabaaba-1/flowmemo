/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");

const BASE_URL = process.env.FLOWMEMO_TEST_URL || "http://localhost:3002";

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
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await dismissCoverIfPresent(page);
    await assertVisible(page.getByText("启程前，把旅程线索先交给我"), "onboarding title");
    await page.screenshot({ path: "artifacts/pipeline-01-onboarding.png", fullPage: true });

    await page.getByRole("button", { name: /开启织流/ }).click();
    await page.waitForURL("**/journey/demo-journey-izu", { timeout: 10000 });
    await assertVisible(page.getByText("聊天"), "chat tab");
    await assertVisible(page.getByRole("button", { name: "按住说话" }), "voice-first input");
    await page.screenshot({ path: "artifacts/pipeline-02-chat-initial.png", fullPage: true });

    await page.getByRole("button", { name: "筑地早餐" }).click();
    const pocketButton = page.getByRole("button", { name: /智能锦囊/ });
    await assertVisible(pocketButton, "dynamic pocket entry", 20000);
    await page.screenshot({ path: "artifacts/pipeline-03-pocket-awake.png", fullPage: true });

    await page.getByRole("button", { name: /时间线/ }).click();
    await assertVisible(page.getByText(/Day 1/), "timeline content");
    await assertVisible(page.getByText("已从照片池匹配").first(), "matched timeline content", 15000);
    await page.screenshot({ path: "artifacts/pipeline-04-timeline.png", fullPage: true });

    await page.getByRole("button", { name: /生成今日手账/ }).click();
    await page.waitForURL("**/daily-canvas/demo-journey-izu", { timeout: 10000 });
    await assertVisible(page.getByText("今日画卷").first(), "scrapbook journal", 20000);
    await page
      .waitForFunction(() => !document.body.innerText.includes("正在把今天织成手账"), undefined, {
        timeout: 30000,
      })
      .catch(() => {});
    await page.screenshot({ path: "artifacts/pipeline-05-journal.png", fullPage: true });
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
