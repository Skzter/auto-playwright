import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    // Add any global page setup here
    await use(page);
  },
});

export { expect } from "@playwright/test";
