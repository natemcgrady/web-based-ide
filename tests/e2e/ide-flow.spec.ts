import { expect, test } from "@playwright/test";

test("loads IDE shell and primary controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("web-based-ide")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Sandbox Session" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync to Sandbox" })).toBeVisible();
  await expect(page.getByText("Explorer")).toBeVisible();
  await expect(page.getByText("Terminal")).toBeVisible();
  await expect(page.getByText("Preview")).toBeVisible();
});
