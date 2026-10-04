import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.beforeAll(() => mkdirSync("artifacts", { recursive:true }));

async function setFixedDate(page) {
  await page.goto("/");
  const date = page.locator("#date");
  await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/day?date=2026-10-04") && r.ok()),
    date.fill("2026-10-04")
  ]);
}

test("V2 today view stays minimal and provenance-aware", async ({ page }, testInfo) => {
  await setFixedDate(page);
  await expect(page.getByText("Âm 24/8", { exact:false })).toBeVisible();
  await expect(page.getByText("ngày Tân Hợi", { exact:false })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Nên", exact:true })).toBeVisible();
  await expect(page.locator(".week-day")).toHaveCount(7);

  await page.locator("#why").click();
  await expect(page.getByText("Rule:", { exact:false })).toBeVisible();
  await expect(page.getByRole("button", { name:"Giải thích bằng Gemini" })).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path:`artifacts/home-${testInfo.project.name}.png`,
    fullPage:true
  });
});

test("planner returns five ranked dates with rule provenance", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Chọn ngày" }).click();
  await page.locator("#planFrom").fill("2026-10-04");
  await page.locator("#activity").selectOption("contract");
  await page.getByRole("button", { name:"Tìm ngày" }).click();
  await expect(page.locator(".plan-card")).toHaveCount(5);
  await expect(page.locator(".decision-line").first()).toContainText("Decision:");
  await expect(page.locator(".policy-line").first()).toContainText("activity-composition-v2");
  await expect(page.locator(".policy-line").first()).toContainText("tie-break-only");
  await expect(page.locator(".rule-line").first()).not.toHaveText("");
});

test("assistant tracks a plan and generates a proactive brief", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Trợ lý" }).click();
  await page.locator("#intentTitle").fill("Ký hợp đồng căn hộ");
  await page.locator("#intentActivity").selectOption("contract");
  await page.locator("#intentFrom").fill("2026-10-04");
  await page.locator("#intentTo").fill("2026-10-11");
  await page.getByRole("button", { name:"Theo dõi kế hoạch" }).click();

  await expect(page.locator(".saved-plan")).toHaveCount(1);
  await expect(page.getByText("Ký hợp đồng căn hộ", { exact:true })).toBeVisible();
  await expect(page.locator("#briefHeadline")).not.toHaveText("Đang chuẩn bị…");
  await expect(page.locator(".alert-card").first()).toBeVisible();
});

test("profile exposes advanced BaZi while keeping deep analysis folded", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Hồ sơ" }).click();
  await page.locator("#birthDate").fill("2026-10-04");
  await page.locator("#birthTime").fill("12:00");
  await page.getByRole("button", { name:"Lưu thành viên" }).click();

  await expect(page.locator(".pillar")).toHaveCount(4);
  await expect(page.getByText("Nhật chủ", { exact:false }).first()).toBeVisible();
  await page.locator(".deep-profile summary").click();
  await expect(page.getByRole("heading", { name:"Ngũ hành tương đối" })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Thập thần trên Thiên Can" })).toBeVisible();
});

test("profile with missing time on Jie boundary shows uncertainty instead of deep analysis", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Hồ sơ" }).click();
  await page.locator("#birthDate").fill("2026-02-04");
  await page.locator("#birthTime").fill("");
  await page.getByRole("button", { name:"Lưu thành viên" }).click();

  await expect(page.locator(".pillar")).toHaveCount(3);
  await expect(page.getByText("Phân tích sâu tạm ẩn.", { exact:false })).toBeVisible();
  await expect(page.getByText("giữ cả khả năng", { exact:false })).toBeVisible();
  await expect(page.locator(".deep-profile")).toHaveCount(0);
});

test("family registry drives constrained planner compare and feedback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Hồ sơ" }).click();

  await page.locator("#profileName").fill("Anh");
  await page.locator("#birthDate").fill("1995-04-14");
  await page.locator("#birthTime").fill("12:00");
  await page.getByRole("button", { name:"Lưu thành viên" }).click();

  await page.locator("#newFamilyMember").click();
  await page.locator("#profileName").fill("Chị");
  await page.locator("#birthDate").fill("1997-11-17");
  await page.locator("#birthTime").fill("12:00");
  await page.getByRole("button", { name:"Lưu thành viên" }).click();

  await expect(page.locator(".family-member")).toHaveCount(2);
  await expect(page.locator("[data-family-select]:checked")).toHaveCount(2);

  await page.getByRole("button", { name:"Chọn ngày" }).click();
  await expect(page.locator("#plannerFamilyNote")).toContainText("2 thành viên");
  await page.locator("#planFrom").fill("2026-10-01");
  await page.locator("#activity").selectOption("meeting");
  await page.locator("#planDayType").selectOption("weekend");
  await page.getByRole("button", { name:"Tìm ngày" }).click();

  const count = await page.locator(".plan-card").count();
  expect(count).toBeGreaterThan(0);
  await expect(page.locator(".plan-card").first()).toContainText("gia đình 2/2");

  await page.locator("#compareDates").fill("2026-10-04, 2026-10-05");
  await page.getByRole("button", { name:"So sánh trực tiếp" }).click();
  await expect(page.getByText("Ưu tiên trong nhóm so sánh:", { exact:false })).toBeVisible();

  await page.locator('[data-feedback="review"]').first().click();
  await page.getByRole("button", { name:"Hồ sơ" }).click();
  await expect(page.locator("#feedbackHistory")).toContainText("Cần rà");
});

test("legacy single profile migrates into family registry", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lichviet.profile.v2", JSON.stringify({
      name:"Hồ sơ cũ",
      birthDate:"1995-04-14",
      birthTime:"12:00"
    }));
    localStorage.removeItem("lichviet.family.v1");
    localStorage.removeItem("lichviet.family.selection.v1");
    localStorage.removeItem("lichviet.family.active.v1");
  });
  await page.goto("/");
  await page.getByRole("button", { name:"Hồ sơ" }).click();
  await expect(page.locator(".family-member")).toHaveCount(1);
  await expect(page.getByText("Hồ sơ cũ", { exact:true })).toBeVisible();
});

test("sources page exposes rule catalog and limits", async ({ page }) => {
  await page.goto("/sources.html");
  await expect(page.getByRole("heading", { name:"App biết gì, và chưa biết gì?" })).toBeVisible();
  await expect(page.getByText("12 Trực · source fact", { exact:true })).toBeVisible();
  await expect(page.getByText("Activity policy", { exact:true })).toBeVisible();
  await expect(page.getByText("PRODUCT_POLICY", { exact:true }).first()).toBeVisible();
  await expect(page.getByText("Rule catalog", { exact:true })).toBeVisible();
  await expect(page.getByText("DUTY-CHENG", { exact:true })).toBeVisible();
  await expect(page.getByText("Hồ Ngọc Đức", { exact:false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name:"Giới hạn hiện tại" })).toBeVisible();
});

test("V2 APIs include rules, brief and push status", async ({ request }) => {
  const health = await request.get("/api/health");
  const healthBody = await health.json();
  expect(health.ok()).toBeTruthy();
  expect(healthBody.version).toBe("7.0.0");
  expect(healthBody.engine).toBe("verified-engine-v7");

  const conversion = await request.post("/api/convert/lunar-to-solar", {
    data: { day:24, month:8, year:2026, leap:false }
  });
  expect(conversion.ok()).toBeTruthy();
  expect((await conversion.json()).iso).toBe("2026-10-04");

  const verification = await request.get("/api/verification");
  expect(verification.ok()).toBeTruthy();
  const verificationBody = await verification.json();
  expect(verificationBody.mode).toBe("verified-engine");
  expect(verificationBody.regressionCaseCount).toBeGreaterThanOrEqual(5);

  const rules = await request.get("/api/rules");
  expect((await rules.json()).rules.length).toBeGreaterThanOrEqual(24);

  const dutyClassification = await request.get("/api/duty-classification");
  expect(dutyClassification.ok()).toBeTruthy();
  expect((await dutyClassification.json()).duties).toHaveLength(12);

  const activityPolicies = await request.get("/api/activity-policies");
  expect(activityPolicies.ok()).toBeTruthy();
  expect((await activityPolicies.json()).policies).toHaveLength(8);

  const familyProfiles = [
    { id:"a", name:"A", birthDate:"1995-04-14", birthTime:"12:00" },
    { id:"b", name:"B", birthDate:"1997-11-17", birthTime:"12:00" }
  ];
  const familyPlan = await request.post("/api/plan", {
    data:{
      activity:"meeting",
      from:"2026-10-01",
      days:20,
      profiles:familyProfiles,
      constraints:{ dayType:"weekend" }
    }
  });
  expect(familyPlan.ok()).toBeTruthy();
  const familyPlanBody = await familyPlan.json();
  expect(familyPlanBody.results.length).toBeGreaterThan(0);
  expect(familyPlanBody.results.every(x =>
    x.family?.memberCount === 2 &&
    x.constraintEvaluation?.weekend === true
  )).toBeTruthy();

  const compare = await request.post("/api/compare", {
    data:{
      activity:"contract",
      dates:["2026-10-04","2026-10-05"],
      profiles:familyProfiles,
      constraints:{ excludeDates:["2026-10-04"] }
    }
  });
  expect(compare.ok()).toBeTruthy();
  const compareBody = await compare.json();
  expect(compareBody.winner.date).toBe("2026-10-05");
  expect(compareBody.explanation).toBeTruthy();

  const traceHash = compareBody.candidates[1].recommendationDecision.trace.hash;
  const feedback = await request.post("/api/feedback", {
    data:{
      feedback:"review",
      date:"2026-10-05",
      activity:"contract",
      decision:compareBody.candidates[1].recommendationDecision.code,
      traceHash
    }
  });
  expect(feedback.ok()).toBeTruthy();
  expect((await feedback.json()).engine).toBe("verified-engine-v7");

  const feedbackList = await request.get("/api/feedback?limit=20");
  expect(feedbackList.ok()).toBeTruthy();
  expect((await feedbackList.json()).items.some(x => x.traceHash === traceHash)).toBeTruthy();

  const evidence = await request.get("/api/evidence?id=XJ-HUANGHEI");
  expect(evidence.ok()).toBeTruthy();
  const evidenceBody = await evidence.json();
  expect(evidenceBody.records).toHaveLength(1);
  expect(evidenceBody.records[0].id).toBe("XJ-HUANGHEI");
  expect(evidenceBody.records[0].source?.id).toBe("xieji-huanghei");
  expect(evidenceBody.records[0].locator).toBeTruthy();

  const sources = await request.get("/api/sources");
  expect(sources.ok()).toBeTruthy();
  const sourcesBody = await sources.json();
  expect(sourcesBody.sources.some(x =>
    x.id === "xieji-huanghei" && Number(x.authorityRank) >= 4
  )).toBeTruthy();

  const brief = await request.post("/api/brief", {
    data: {
      date:"2026-10-04",
      plans:[{
        id:"p1",title:"Ký hợp đồng",activity:"contract",
        from:"2026-10-04",to:"2026-10-11"
      }]
    }
  });
  expect(brief.ok()).toBeTruthy();
  expect((await brief.json()).generatedBy).toBe("deterministic-brief-v4");

  const push = await request.get("/api/push/config");
  expect(push.ok()).toBeTruthy();
  expect(typeof (await push.json()).enabled).toBe("boolean");

  const ai = await request.get("/api/ai/status");
  expect(ai.ok()).toBeTruthy();
  const aiBody = await ai.json();
  expect(aiBody.provider).toBe("gemini-cli");
  expect(aiBody.model).toBe("gemini-3.8-flash");
  expect(aiBody.auth).toBe("google-oauth");
  expect(aiBody.apiKeysAllowed).toBe(false);

  const telegram = await request.get("/api/telegram/status");
  expect(telegram.ok()).toBeTruthy();
  const telegramBody = await telegram.json();
  expect(typeof telegramBody.enabled).toBe("boolean");
  expect("token" in telegramBody).toBe(false);
  expect("chatId" in telegramBody).toBe(false);
});


test("notification topics can be selected and saved", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name:"Hồ sơ" }).click();

  await page.locator("#notifyOverview").check();
  await page.locator("#notifyPlans").check();
  await page.locator("#notifyUpcoming").uncheck();
  await page.locator("#notifyPersonal").check();
  await page.locator("#reminderTime").fill("07:30");
  await page.getByRole("button", { name:"Lưu thông báo" }).click();

  await expect(page.getByText("Telegram sẽ chỉ gửi", { exact:false })).toBeVisible();

  const settings = await request.get("/api/notifications/settings");
  expect(settings.ok()).toBeTruthy();
  const body = await settings.json();
  expect(body.enabled).toBe(true);
  expect(body.topics.overview).toBe(true);
  expect(body.topics.plans).toBe(true);
  expect(body.topics.upcoming).toBe(false);
  expect(body.topics.personal).toBe(true);
});
