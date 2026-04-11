import { expect, test } from "@playwright/test";

test("login page renders key fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back 👋" })).toBeVisible();
  await expect(page.getByLabel("Email or Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
});

test("register page renders onboarding form", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Help Center" })).toBeVisible();
});
