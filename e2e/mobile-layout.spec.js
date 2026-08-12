import { expect, test } from "@playwright/test";

const PHONE_VIEWPORTS = [
  { name: "small phone", width: 320, height: 700 },
  { name: "iPhone-sized", width: 390, height: 844 },
  { name: "large phone", width: 430, height: 932 },
];

for (const phone of PHONE_VIEWPORTS) {
  test(`landing layout does not overflow on ${phone.name}`, async ({ page }) => {
    await page.setViewportSize({ width: phone.width, height: phone.height });
    await page.goto("/");

    await expect(page.locator("body")).toBeVisible();

    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });
}

test("mobile app header uses the menu button instead of desktop navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");

  const menuButton = page.getByRole("button", { name: /open menu/i });
  await expect(menuButton).toBeVisible();
  await expect(page.locator(".app-nav--desktop")).toBeHidden();

  await menuButton.click();
  await expect(page.locator(".app-nav-drawer")).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
