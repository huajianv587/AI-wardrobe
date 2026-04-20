import { expect, test, type Page } from "@playwright/test";

import { prepareStablePage, waitForSettledUi } from "./test-helpers";

const AUTH_STORAGE_KEY = "ai-wardrobe.auth.session";
const uniqueSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const credentials = {
  email: `playwright-${uniqueSeed}@example.com`,
  password: `Wardrobe!${uniqueSeed.slice(0, 6)}`,
  newPassword: `FreshLook!${uniqueSeed.slice(-6)}`
};

let storedSession: string | null = null;

async function seedSession(page: Page) {
  test.skip(!storedSession, "Missing stored auth session from the auth flow.");
  await page.addInitScript(
    ([storageKey, session]) => {
      if (typeof session === "string" && session.length > 0) {
        window.localStorage.setItem(storageKey, session);
      }
    },
    [AUTH_STORAGE_KEY, storedSession] as const
  );
}

test("assistant guest preview stays local and stable", async ({ page }) => {
  const guard = await prepareStablePage(page);

  await page.goto("/assistant");
  await waitForSettledUi(page);

  await expect(page.getByTestId("assistant-overview")).toBeVisible();
  await expect(page.getByTestId("assistant-status")).toContainText(/预览|本地/);

  await page.getByTestId("assistant-save-profile").click();
  await expect.poll(
    async () => ((await page.getByTestId("assistant-status").textContent()) ?? "").trim(),
    { timeout: 10_000 }
  ).toContain("预览模式");

  await page.getByTestId("assistant-generate-packing").click();
  await expect.poll(
    async () => ((await page.getByTestId("assistant-packing-summary").textContent()) ?? "").trim().length,
    { timeout: 15_000 }
  ).toBeGreaterThan(10);

  await page.getByRole("button", { name: "保存搭配" }).first().click();
  await expect(page.getByTestId("assistant-status")).toContainText(/本地|预览/);

  await guard.assertNoClientErrors();
});

test.describe.serial("AI Wardrobe delivery flows", () => {
  test("registers, resets password directly, and signs back in", async ({ page }) => {
    const guard = await prepareStablePage(page);

    await page.goto("/register");
    await waitForSettledUi(page);

    await expect(page.getByTestId("auth-page-register")).toBeVisible();
    await page.getByTestId("register-nickname").fill("Playwright Tester");
    await page.getByTestId("register-gender").fill("女");
    await page.getByTestId("register-email").fill(credentials.email);
    await page.getByTestId("register-password").fill(credentials.password);
    await page.getByTestId("register-agree").click();
    await page.getByTestId("register-submit").click();

    await page.waitForURL("**/wardrobe", { timeout: 30_000 });
    await expect(page.getByTestId("experience-shell")).toBeVisible();

    await page.evaluate((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, AUTH_STORAGE_KEY);

    await page.goto("/login");
    await expect(page.getByTestId("auth-page-login")).toBeVisible();
    await page.getByTestId("forgot-password-toggle").click();
    await page.getByTestId("forgot-email").fill(credentials.email);
    await page.getByTestId("forgot-submit").click();

    await page.waitForURL(/\/reset-password\?email=/, { timeout: 15_000 });
    await expect(page.getByTestId("reset-email")).toHaveValue(credentials.email);
    await page.getByTestId("reset-new-password").fill(credentials.newPassword);
    await page.getByTestId("reset-confirm-password").fill(credentials.newPassword);
    await page.getByTestId("reset-submit").click();

    await page.waitForURL("**/login", { timeout: 15_000 });
    await page.getByTestId("login-email").fill(credentials.email);
    await page.getByTestId("login-password").fill(credentials.newPassword);
    await page.getByTestId("login-submit").click();

    await page.waitForURL("**/wardrobe", { timeout: 30_000 });
    await expect(page.getByTestId("experience-frame")).toBeVisible();

    storedSession = await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), AUTH_STORAGE_KEY);
    expect(storedSession).toBeTruthy();

    await guard.assertNoClientErrors();
  });

  test("loads homepage third screen, wardrobe, assistant, and closet analysis", async ({ page }) => {
    const guard = await prepareStablePage(page);
    await seedSession(page);

    await page.goto("/");
    await waitForSettledUi(page);
    await expect(page.getByTestId("home-third-screen")).toBeVisible();
    await expect(page.frameLocator("[data-testid='home-third-screen-frame']").locator("body")).toContainText("Top 3");

    await page.goto("/wardrobe");
    await waitForSettledUi(page);
    await expect(page.getByTestId("experience-frame")).toBeVisible();
    await expect(page.frameLocator("[data-testid='experience-frame']").locator("body")).toContainText(/Total Items|上传/);

    await page.goto("/assistant");
    await waitForSettledUi(page);
    await expect(page.getByTestId("assistant-overview")).toBeVisible();
    await expect(page.getByTestId("assistant-status")).toHaveText(/.+/);

    await page.getByTestId("assistant-location-input").fill("Singapore");
    await page.getByTestId("assistant-location-search").click();
    await page.getByTestId("assistant-generate-tomorrow").click();
    await expect.poll(
      async () => (await page.getByTestId("assistant-tomorrow-summary").textContent())?.trim().length ?? 0,
      { timeout: 20_000 }
    ).toBeGreaterThan(12);

    await page.getByTestId("assistant-quick-mode-0").click();
    await page.getByTestId("assistant-generate-packing").click();
    await expect.poll(
      async () => (await page.getByTestId("assistant-packing-summary").textContent())?.trim().length ?? 0,
      { timeout: 30_000 }
    ).toBeGreaterThan(12);

    const statusBeforeSave = (await page.getByTestId("assistant-status").textContent()) ?? "";
    await page.getByTestId("assistant-favorite-colors").fill("奶油白，雾粉，雾蓝");
    await page.getByTestId("assistant-personal-note").fill("Playwright 已验证风格记忆可以稳定保存。");
    await page.getByTestId("assistant-save-profile").click();
    await expect.poll(
      async () => ((await page.getByTestId("assistant-status").textContent()) ?? "").trim(),
      { timeout: 15_000 }
    ).not.toBe(statusBeforeSave.trim());

    await page.goto("/closet-analysis");
    await waitForSettledUi(page);
    await expect(page.getByTestId("experience-frame")).toBeVisible();
    await expect(page.frameLocator("[data-testid='experience-frame']").locator("body")).toContainText(/Wardrobe Analytics|上装|缺口分析/);

    await guard.assertNoClientErrors();
  });
});
