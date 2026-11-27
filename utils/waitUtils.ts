import { Page, Locator, expect } from '@playwright/test';

export class WaitUtils {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    static async waitForVisible(locator: Locator, timeout?: number) {
        await locator.waitFor({ state: 'visible', timeout });
    }


    static async waitForHidden(locator: Locator) {
        await expect(locator.filter({ visible: true })).toHaveCount(0);
    }

    static async waitForDropdownVisible(dropdownContainer: Locator) {
        await dropdownContainer.waitFor({ state: 'visible' });
    }
}
