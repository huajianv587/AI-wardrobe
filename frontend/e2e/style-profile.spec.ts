import { expect, test } from "@playwright/test";

import {
  mockExperienceStyleProfile,
  prepareStablePage,
  seedMockAuthSession,
  waitForSettledUi
} from "./test-helpers";

async function openNoteEditor(page: import("@playwright/test").Page) {
  await page.getByTestId("style-profile-edit-note").click();
  await expect(page.getByTestId("style-profile-editor")).toBeVisible();
}

test("style profile shows an explicit login prompt when unauthorized", async ({ page }) => {
  const guard = await prepareStablePage(page, {
    ignoreConsolePatterns: [/401 \(Unauthorized\)/]
  });
  await mockExperienceStyleProfile(page, { getStatus: 401 });

  await page.goto("/style-profile");
  await waitForSettledUi(page, 300);

  await expect(page.getByTestId("style-profile-empty-state")).toContainText("登录后查看你的风格画像");
  await expect(page.getByRole("button", { name: "前往登录" })).toBeVisible();

  await guard.assertNoClientErrors();
});

test("style profile falls back to demo mode and saves locally", async ({ page }) => {
  const guard = await prepareStablePage(page, {
    ignoreConsolePatterns: [/500 \(Internal Server Error\)/]
  });
  await mockExperienceStyleProfile(page, { getStatus: 500 });

  await page.goto("/style-profile");
  await waitForSettledUi(page, 400);

  await expect(page.getByTestId("style-profile-mode-notice")).toContainText("演示模式");
  await expect(page.getByTestId("style-profile-page")).toBeVisible();

  await openNoteEditor(page);
  await page.locator("textarea").fill("这是 Playwright 在演示模式下写入的本地备注。");
  await page.getByTestId("style-profile-save").click();

  await expect(page.getByTestId("style-profile-toast")).toContainText("已先保存在当前设备");
  await expect(page.getByTestId("style-profile-note")).toContainText("这是 Playwright 在演示模式下写入的本地备注。");

  await guard.assertNoClientErrors();
});

test("style profile shows a calm success feedback after saving", async ({ page }) => {
  const guard = await prepareStablePage(page);
  await seedMockAuthSession(page);
  await mockExperienceStyleProfile(page, {
    getStatus: 200,
    putStatus: 200,
    putMessage: "风格画像已保存，推荐会逐步跟进这份更新。"
  });

  await page.goto("/style-profile");
  await waitForSettledUi(page, 400);

  await expect(page.getByTestId("style-profile-page")).toBeVisible();
  await expect(page.getByTestId("style-profile-mode-notice")).toHaveCount(0);

  await openNoteEditor(page);
  await page.locator("textarea").fill("这是一次成功保存的测试备注。");
  await page.getByTestId("style-profile-save").click();

  await expect(page.getByTestId("style-profile-toast")).toContainText("风格画像已保存");

  await guard.assertNoClientErrors();
});

test("style profile shows a readable failure message when saving fails", async ({ page }) => {
  const guard = await prepareStablePage(page, {
    ignoreConsolePatterns: [/500 \(Internal Server Error\)/]
  });
  await seedMockAuthSession(page);
  await mockExperienceStyleProfile(page, { getStatus: 200, putStatus: 500 });

  await page.goto("/style-profile");
  await waitForSettledUi(page, 400);

  await openNoteEditor(page);
  await page.locator("textarea").fill("这是一次失败保存的测试备注。");
  await page.getByTestId("style-profile-save").click();

  await expect(page.getByTestId("style-profile-toast")).toContainText("保存失败");
  await expect(page.getByTestId("style-profile-editor")).toBeVisible();

  await guard.assertNoClientErrors();
});
