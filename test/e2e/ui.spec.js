import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.beforeAll(() => mkdirSync("artifacts", { recursive: true }));

async function setFixedDate(page) {
  await page.goto("/");
  const date = page.locator("#date");
  await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/day?date=2026-10-04") && r.ok()),
    date.fill("2026-10-04")
  ]);
}

test("today view is Vietnamese, minimal and responsive", async ({ page }, testInfo) => {
  await setFixedDate(page);
  await expect(page.getByText("Âm 24/8", { exact:false })).toBeVisible();
  await expect(page.getByText("ngày Tân Hợi", { exact:false })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Nên", exact:true })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Nên tránh", exact:true })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Giờ thuận" })).toBeVisible();
  await expect(page.locator(".week-day")).toHaveCount(7);

  await page.locator("#why").click();
  await expect(page.getByText("Độ tin cậy:", { exact:false })).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({ path:`artifacts/home-${testInfo.project.name}.png`, fullPage:true });
});

test("planner returns a short ranked list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Chọn ngày" }).click();
  await page.locator("#planFrom").fill("2026-10-04");
  await page.locator("#activity").selectOption("contract");
  await page.getByRole("button", { name:"Tìm ngày" }).click();
  await expect(page.locator(".plan-card").first()).toBeVisible();
  await expect(page.locator(".plan-card")).toHaveCount(5);
  await expect(page.getByText("#1", { exact:true })).toBeVisible();
});

test("profile supports birth time but never requires it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Hồ sơ" }).click();
  await page.locator("#birthDate").fill("1995-04-14");
  await page.locator("#birthTime").fill("08:00");
  await page.getByRole("button", { name:"Lưu hồ sơ" }).click();
  await expect(page.locator(".pillar")).toHaveCount(4);
  await expect(page.getByText("Đủ 4 trụ", { exact:false })).toBeVisible();
});

test("sources page exposes method and limits", async ({ page }) => {
  await page.goto("/sources.html");
  await expect(page.getByRole("heading", { name:"App biết gì, và chưa biết gì?" })).toBeVisible();
  await expect(page.getByText("Hồ Ngọc Đức", { exact:false }).first()).toBeVisible();
  await expect(page.getByText("Khâm Thiên Giám", { exact:false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name:"Giới hạn hiện tại" })).toBeVisible();
});

test("API health and planner endpoints work", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).calendar).toContain("UTC+7");

  const plan = await request.get("/api/plan?from=2026-10-04&days=14&activity=contract");
  expect(plan.ok()).toBeTruthy();
  expect((await plan.json()).results).toHaveLength(5);
});
