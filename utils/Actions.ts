import { Page, Locator } from '@playwright/test';
import userData from '../data/userData.json';

export class PlaywrightActions {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // open website
    async openWebsite(url: string): Promise<void> {
        await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });
    }

    findLocator(locatorValue: string | Locator): Locator {
        return typeof locatorValue === 'string'
            ? this.page.locator(locatorValue)
            : locatorValue;
    }

    async clickOnElement(locatorValue: string | Locator): Promise<void> {
        const locator = this.findLocator(locatorValue);
        await locator.click();
    }

    async enterText(locatorValue: string | Locator, text: string): Promise<void> {
        const textbox = this.findLocator(locatorValue);
        await textbox.click();
        await textbox.clear();
        await textbox.fill(text);
    }

    async mouseHover(locatorValue: string | Locator): Promise<void> {
        await this.findLocator(locatorValue).hover();
    }

    async selectValueFromDropdown(locatorValue: string | Locator, optionValue: string): Promise<void> {
        await this.findLocator(locatorValue).selectOption({ label: optionValue });
    }

    async fileUpload(locatorValue: string | Locator, filePath: string): Promise<void> {
        await this.findLocator(locatorValue).setInputFiles(filePath);
    }

    async scrollIntoViewIfNeeded(locatorValue: string | Locator): Promise<void> {
        await this.findLocator(locatorValue).scrollIntoViewIfNeeded();
    }

    async getVisibleText(locatorValue: string | Locator): Promise<string> {
        return await this.findLocator(locatorValue).innerText();
    }

    async getAttributeValue(locatorValue: string | Locator, attributeName: string): Promise<string | null> {
        return await this.findLocator(locatorValue).getAttribute(attributeName);
    }

    // Reusable random generator for any character set and length
    static generateRandom(chars: string, length: number): string {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Existing method now reuses generateRandom (keeps old tests working!)
    randomStringGenerator(text: string): string {
        const randomPart = PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz', 5);
        return `${text}_${randomPart}`;
    }



    getUserData() {
        return userData;
    }
}
