import { test, expect } from '@playwright/test';

test.describe('Monorepo Integration - Frontend', () => {
    test('should display API version from shared types', async ({ page }) => {
        await page.goto('http://localhost:3000');

        // Verify that the page uses the shared API_VERSION constant
        const heading = page.locator('h1');
        await expect(heading).toContainText('Co-Founder Platform - API v1');
    });

    test('should verify shared types package is working', async ({ page }) => {
        await page.goto('http://localhost:3000');

        // The fact that the page renders without errors means
        // the @co-founder/types package is correctly resolved
        await expect(page).toHaveTitle(/Next.js/);
    });
});
