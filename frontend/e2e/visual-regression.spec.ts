import { expect, test, type Page } from "@playwright/test";

import { mockExperienceStyleProfile, prepareStablePage, waitForSettledUi } from "./test-helpers";

async function prepareStyleProfilePage(page: Page) {
  await mockExperienceStyleProfile(page);
}

async function snapshotExperienceShell(page: Page, shellTestId: string, frameTestId: string, snapshotName: string) {
  await expect(page.getByTestId(shellTestId)).toHaveScreenshot(snapshotName, {
    mask: [page.getByTestId(frameTestId)]
  });
}

const DESKTOP_ROUTES: Array<{
  name: string;
  path: string;
  locator: (page: Page) => ReturnType<Page["locator"]> | ReturnType<Page["getByTestId"]>;
  snapshot: string;
  waitMs?: number;
  prepare?: (page: Page) => Promise<void>;
}> = [
  {
    name: "home hero stays visually stable",
    path: "/",
    locator: (page) => page.locator('[aria-label="首页首屏"]'),
    snapshot: "home-hero-desktop.png",
    waitMs: 400
  },
  {
    name: "login page keeps its visual baseline",
    path: "/login",
    locator: (page) => page.getByTestId("auth-page-login"),
    snapshot: "login-page-desktop.png",
    waitMs: 250
  },
  {
    name: "register page keeps its visual baseline",
    path: "/register",
    locator: (page) => page.getByTestId("auth-page-register"),
    snapshot: "register-page-desktop.png",
    waitMs: 250
  },
  {
    name: "reset password page keeps its visual baseline",
    path: "/reset-password",
    locator: (page) => page.getByTestId("auth-page-reset"),
    snapshot: "reset-password-page-desktop.png",
    waitMs: 250
  },
  {
    name: "assistant overview keeps its visual baseline",
    path: "/assistant",
    locator: (page) => page.getByTestId("assistant-overview"),
    snapshot: "assistant-overview-desktop.png",
    waitMs: 400
  },
  {
    name: "recommend page keeps its visual baseline",
    path: "/recommend",
    locator: (page) => page.locator(".app-shell-root"),
    snapshot: "recommend-page-desktop.png",
    waitMs: 350
  },
  {
    name: "try-on route keeps its visual baseline",
    path: "/try-on",
    locator: (page) => page.locator("body"),
    snapshot: "try-on-page-desktop.png",
    waitMs: 500
  },
  {
    name: "wardrobe route keeps its visual baseline",
    path: "/wardrobe",
    locator: (page) => page.getByTestId("experience-shell"),
    snapshot: "wardrobe-page-desktop.png",
    waitMs: 400
  },
  {
    name: "style profile page keeps its visual baseline",
    path: "/style-profile",
    locator: (page) => page.getByTestId("style-profile-page"),
    snapshot: "style-profile-page-desktop.png",
    waitMs: 450,
    prepare: prepareStyleProfilePage
  },
  {
    name: "closet analysis route keeps its visual baseline",
    path: "/closet-analysis",
    locator: (page) => page.getByTestId("experience-shell"),
    snapshot: "closet-analysis-page-desktop.png",
    waitMs: 400
  },
  {
    name: "smart wardrobe route keeps its visual baseline",
    path: "/smart-wardrobe",
    locator: (page) => page.getByTestId("experience-shell"),
    snapshot: "smart-wardrobe-page-desktop.png",
    waitMs: 400
  },
  {
    name: "outfit diary route keeps its visual baseline",
    path: "/outfit-diary",
    locator: (page) => page.getByTestId("experience-shell"),
    snapshot: "outfit-diary-page-desktop.png",
    waitMs: 400
  }
];

const EXPERIENCE_SHELL_ROUTES = [
  {
    name: "experience closet analysis shell stays visually stable",
    path: "/experience/closet-analysis",
    shellTestId: "experience-closet-analysis-frame-shell",
    frameTestId: "experience-closet-analysis-frame",
    snapshot: "experience-closet-analysis-shell-desktop.png"
  },
  {
    name: "experience smart wardrobe shell stays visually stable",
    path: "/experience/smart-wardrobe",
    shellTestId: "experience-smart-wardrobe-frame-shell",
    frameTestId: "experience-smart-wardrobe-frame",
    snapshot: "experience-smart-wardrobe-shell-desktop.png"
  },
  {
    name: "experience style profile shell stays visually stable",
    path: "/experience/style-profile",
    shellTestId: "experience-style-profile-frame-shell",
    frameTestId: "experience-style-profile-frame",
    snapshot: "experience-style-profile-shell-desktop.png"
  },
  {
    name: "experience outfit diary shell stays visually stable",
    path: "/experience/outfit-diary",
    shellTestId: "experience-outfit-diary-frame-shell",
    frameTestId: "experience-outfit-diary-frame",
    snapshot: "experience-outfit-diary-shell-desktop.png"
  },
  {
    name: "experience wardrobe management shell stays visually stable",
    path: "/experience/wardrobe-management",
    shellTestId: "experience-wardrobe-management-frame-shell",
    frameTestId: "experience-wardrobe-management-frame",
    snapshot: "experience-wardrobe-management-shell-desktop.png"
  }
] as const;

const MOBILE_ROUTES: Array<{
  name: string;
  path: string;
  locator: (page: Page) => ReturnType<Page["locator"]> | ReturnType<Page["getByTestId"]>;
  snapshot: string;
  waitMs?: number;
  prepare?: (page: Page) => Promise<void>;
}> = [
  {
    name: "home hero stays visually stable on mobile",
    path: "/",
    locator: (page) => page.locator('[aria-label="首页首屏"]'),
    snapshot: "home-hero-mobile.png",
    waitMs: 400
  },
  {
    name: "assistant overview stays visually stable on mobile",
    path: "/assistant",
    locator: (page) => page.getByTestId("assistant-overview"),
    snapshot: "assistant-overview-mobile.png",
    waitMs: 400
  },
  {
    name: "try-on route stays visually stable on mobile",
    path: "/try-on",
    locator: (page) => page.locator("body"),
    snapshot: "try-on-page-mobile.png",
    waitMs: 500
  },
  {
    name: "style profile page stays visually stable on mobile",
    path: "/style-profile",
    locator: (page) => page.getByTestId("style-profile-page"),
    snapshot: "style-profile-page-mobile.png",
    waitMs: 450,
    prepare: prepareStyleProfilePage
  },
  {
    name: "login page stays visually stable on mobile",
    path: "/login",
    locator: (page) => page.getByTestId("auth-page-login"),
    snapshot: "login-page-mobile.png",
    waitMs: 250
  }
];

test.describe("desktop visual baselines", () => {
  for (const route of DESKTOP_ROUTES) {
    test(route.name, async ({ page }) => {
      const guard = await prepareStablePage(page);
      if (route.prepare) {
        await route.prepare(page);
      }

      await page.goto(route.path);
      await waitForSettledUi(page, route.waitMs ?? 250);

      await expect(route.locator(page)).toHaveScreenshot(route.snapshot);
      await guard.assertNoClientErrors();
    });
  }

  for (const route of EXPERIENCE_SHELL_ROUTES) {
    test(route.name, async ({ page }) => {
      const guard = await prepareStablePage(page);

      await page.goto(route.path);
      await waitForSettledUi(page, 400);

      await snapshotExperienceShell(page, route.shellTestId, route.frameTestId, route.snapshot);
      await guard.assertNoClientErrors();
    });
  }
});

test.describe("mobile visual baselines", () => {
  for (const route of MOBILE_ROUTES) {
    test(route.name, async ({ page }) => {
      const guard = await prepareStablePage(page);
      await page.setViewportSize({ width: 390, height: 844 });
      if (route.prepare) {
        await route.prepare(page);
      }

      await page.goto(route.path);
      await waitForSettledUi(page, route.waitMs ?? 250);

      await expect(route.locator(page)).toHaveScreenshot(route.snapshot);
      await guard.assertNoClientErrors();
    });
  }
});
