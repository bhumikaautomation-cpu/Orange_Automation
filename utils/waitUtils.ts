import { Page, Locator } from '@playwright/test';

export class WaitUtils {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    static async waitForVisible(locator: Locator, timeout = 15000) {
        await locator.waitFor({ state: 'visible', timeout });
    }

    static async waitForHidden(locator: Locator, timeout = 15000) {
        for (const item of await locator.all()) await item.waitFor({ state: 'hidden', timeout });
    }

    static async waitForDropdownVisible(dropdownContainer: Locator, timeout = 15000) {
        await dropdownContainer.waitFor({ state: 'visible', timeout });
    }
}
