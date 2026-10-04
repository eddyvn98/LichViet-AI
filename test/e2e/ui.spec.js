import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.beforeAll(() => mkdirSync("artifacts", { recursive: true }));

test("homepage is readable and interactive", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("Lịch Việt", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Hôm nay nên làm gì?")).toBeVisible();

  const date = page.locator("#date");
  await date.fill("2026-10-04");
  await page.waitForResponse(r => r.url().includes("/api/day?date=2026-10-04") && r.ok());

  await expect(page.locator("#label")).not.toHaveText("");
  await expect(page.locator("#canchi")).toContainText("Can Chi:");
  await expect(page.getByRole("heading", { name: "Nên" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nên tránh" })).toBeVisible();

  await page.getByRole("button", { name: "Vì sao?" }).click();
  await expect(page.getByRole("heading", { name: "Giải thích ngắn" })).toBeVisible();
  await expect(page.getByText("12 Trực:", { exact: false })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: `artifacts/home-${testInfo.project.name}.png`,
    fullPage: true
  });
});

test("sources page explains provenance", async ({ page }) => {
  await page.goto("/sources.html");
  await expect(page.getByRole("heading", { name: "Thứ tự tin cậy" })).toBeVisible();
  await expect(page.getByText("Tyme4TS 1.5.3", { exact: false })).toBeVisible();
  await expect(page.getByText("AI:", { exact: false })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("API health and deterministic day endpoint work", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  const day = await request.get("/api/day?date=2026-10-04");
  expect(day.ok()).toBeTruthy();
  const body = await day.json();
  expect(body.date).toBe("2026-10-04");
  expect(body.canChi).toBeTruthy();
  expect(body.recommended.length).toBeGreaterThan(0);
});
