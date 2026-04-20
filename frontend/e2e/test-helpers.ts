import { expect, type Page } from "@playwright/test";

const FIXED_NOW_ISO = "2026-04-20T09:30:00+08:00";
const AUTH_STORAGE_KEY = "ai-wardrobe.auth.session";

const FIXED_HOME_WEATHER = {
  location_name: "Singapore",
  timezone: "Asia/Singapore",
  current_time: FIXED_NOW_ISO,
  weather_code: 1,
  condition_label: "晴间多云",
  condition_label_zh: "晴间多云",
  temperature: 28,
  apparent_temperature: 31,
  wind_speed: 8,
  is_day: true,
  precipitation: 0,
  temperature_max: 31,
  temperature_min: 25,
  precipitation_probability_max: 12,
  outfit_hint: "轻薄上衣外加一件顺手外层，会更适合室内外切换。"
};

const STYLE_PROFILE_FIXTURE = {
  hero_subtitle: "已同步真实偏好 · 通勤时偏爱柔和、轻盈、不过分板正的搭配。",
  dna: [
    { label: "柔和甜感", value: 24, color: "#F0A6C1" },
    { label: "优雅知性", value: 20, color: "#C7A07B" },
    { label: "轻街头感", value: 8, color: "#A794C9" },
    { label: "通勤利落", value: 18, color: "#8EA6BD" },
    { label: "曲线表达", value: 10, color: "#D68D8D" },
    { label: "慵懒舒适", value: 20, color: "#9CB792" }
  ],
  favorite_colors: [
    { name: "奶油白", hex: "#F5EBDD" },
    { name: "雾粉", hex: "#E8BBB6" },
    { name: "浅灰蓝", hex: "#B9C8D6" }
  ],
  avoid_colors: [
    { name: "荧光绿", hex: "#A8FF3E" },
    { name: "高饱和紫", hex: "#7A42D7" }
  ],
  silhouettes: [
    { name: "H型", desc: "线条平稳，适合通勤和长时间穿着。", preferred: true, badge: "偏爱", item_count: 4, wear_count: 9, examples: ["奶油白衬衫", "烟粉直筒裙"] },
    { name: "A型", desc: "下摆更轻盈，走动时更有呼吸感。", preferred: true, badge: "偏爱", item_count: 3, wear_count: 6, examples: ["柔雾半裙", "奶茶色连衣裙"] },
    { name: "宽松直筒", desc: "松弛但不拖沓，久坐和叠穿都更友好。", preferred: false, badge: "观察中", item_count: 2, wear_count: 4, examples: ["灰蓝针织衫", "深蓝牛仔裤"] }
  ],
  keywords: [
    { label: "柔和", tone: "primary" },
    { label: "轻盈", tone: "primary" },
    { label: "通勤", tone: "secondary" },
    { label: "安静精致", tone: "secondary" },
    { label: "面料柔软", tone: "tertiary" }
  ],
  rules: [
    "通勤造型尽量控制在三种主色以内。",
    "约会或出门时保留一个柔和亮点。",
    "配饰只保留一个主重点，让整体更轻松。"
  ],
  personal_note: "想要温柔、透气、有呼吸感，不想为了精致而显得太用力。",
  updated_at_label: "2026/4/20 09:30 已更新",
  profile: {
    favorite_colors: ["奶油白", "雾粉", "浅灰蓝"],
    avoid_colors: ["荧光绿", "高饱和紫"],
    favorite_silhouettes: ["H型", "A型", "宽松直筒"],
    avoid_silhouettes: ["合体修身"],
    style_keywords: ["柔和", "轻盈", "通勤", "安静精致"],
    dislike_keywords: ["过度街头", "太强攻击感"],
    commute_profile: "轻正式，但不要显得太板正。",
    comfort_priorities: ["面料柔软", "方便久坐", "行动轻松"],
    wardrobe_rules: [
      "通勤造型尽量控制在三种主色以内。",
      "约会或出门时保留一个柔和亮点。",
      "配饰只保留一个主重点，让整体更轻松。"
    ],
    personal_note: "想要温柔、透气、有呼吸感，不想为了精致而显得太用力。"
  }
};

function shouldIgnoreConsoleMessage(message: string, extraPatterns: RegExp[] = []) {
  if (message.includes("favicon.ico")) {
    return true;
  }

  return extraPatterns.some((pattern) => pattern.test(message));
}

export async function prepareStablePage(page: Page, options?: {
  mockHomeWeather?: boolean;
  ignoreConsolePatterns?: RegExp[];
}) {
  const { mockHomeWeather = true, ignoreConsolePatterns = [] } = options ?? {};
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") {
      return;
    }

    const text = msg.text();
    if (!shouldIgnoreConsoleMessage(text, ignoreConsolePatterns)) {
      consoleErrors.push(text);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 1.3521, longitude: 103.8198 });

  await page.addInitScript(({ nowIso }) => {
    const fixedNow = new Date(nowIso).valueOf();
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixedNow);
          return;
        }

        if (args.length === 1) {
          super(args[0]);
          return;
        }

        if (args.length === 2) {
          super(args[0], args[1]);
          return;
        }

        if (args.length === 3) {
          super(args[0], args[1], args[2]);
          return;
        }

        if (args.length === 4) {
          super(args[0], args[1], args[2], args[3]);
          return;
        }

        if (args.length === 5) {
          super(args[0], args[1], args[2], args[3], args[4]);
          return;
        }

        if (args.length === 6) {
          super(args[0], args[1], args[2], args[3], args[4], args[5]);
          return;
        }

        super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      }

      static now() {
        return fixedNow;
      }

      static parse(value: string) {
        return RealDate.parse(value);
      }

      static UTC(...args: Parameters<typeof Date.UTC>) {
        return RealDate.UTC(...args);
      }
    }

    Object.setPrototypeOf(MockDate, RealDate);
    // @ts-expect-error test-only clock shim
    window.Date = MockDate;
  }, { nowIso: FIXED_NOW_ISO });

  if (mockHomeWeather) {
    await page.route("**/api/home/current-weather", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(FIXED_HOME_WEATHER)
      });
    });
  }

  return {
    async assertNoClientErrors() {
      expect(
        [...consoleErrors, ...pageErrors],
        `Unexpected browser-side errors:\n${[...consoleErrors, ...pageErrors].join("\n")}`
      ).toEqual([]);
    }
  };
}

export async function waitForSettledUi(page: Page, delayMs = 200) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(delayMs);
}

export async function seedMockAuthSession(page: Page) {
  await page.addInitScript(([storageKey, nowIso]) => {
    const now = new Date(nowIso).valueOf();
    window.localStorage.setItem(storageKey, JSON.stringify({
      access_token: "playwright-access-token",
      refresh_token: "playwright-refresh-token",
      expires_at: Math.floor((now + 86_400_000) / 1000),
      expires_in: 86400,
      token_type: "bearer",
      requires_email_confirmation: false,
      message: null,
      user: {
        id: 99,
        supabase_user_id: "playwright-user",
        email: "playwright@example.com",
        display_name: "Playwright",
        auth_provider: "email",
        avatar_url: null,
        created_at: nowIso
      }
    }));
  }, [AUTH_STORAGE_KEY, FIXED_NOW_ISO] as const);
}

export async function mockExperienceStyleProfile(page: Page, options?: {
  getStatus?: number;
  putStatus?: number;
  putMessage?: string;
  getPayload?: Record<string, unknown>;
}) {
  const {
    getStatus = 200,
    putStatus = 200,
    putMessage = "风格画像已保存",
    getPayload = STYLE_PROFILE_FIXTURE
  } = options ?? {};

  await page.route("**/api/v1/experience/style-profile", async (route, request) => {
    if (request.method() === "GET") {
      if (getStatus === 200) {
        await route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify(getPayload)
        });
        return;
      }

      await route.fulfill({
        status: getStatus,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          detail: getStatus === 401 ? "请先登录" : "样式画像服务暂不可用"
        })
      });
      return;
    }

    if (request.method() === "PUT") {
      if (putStatus === 200) {
        await route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify({
            status: "success",
            message: putMessage,
            updated_at: FIXED_NOW_ISO
          })
        });
        return;
      }

      await route.fulfill({
        status: putStatus,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          detail: "保存失败，请稍后再试。"
        })
      });
      return;
    }

    await route.continue();
  });
}
