import { Page, Locator } from '@playwright/test';
import userData from '../data/userData.json';

export class PlaywrightActions {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async openWebsite(url: string): Promise<void> {
        await this.page.goto(url);
    }

    findLocator(locatorValue: string): Locator {
        return this.page.locator(locatorValue);
    }

    async clickOnElement(locatorValue: string): Promise<void> {
        const locator = this.findLocator(locatorValue);
        await locator.click();
    }

    async enterText(locatorValue: string, text: string): Promise<void> {
        const textbox = this.findLocator(locatorValue);
        await textbox.click();
        await textbox.clear();
        await textbox.fill(text);
    }

    async mouseHover(locatorValue: string): Promise<void> {
        await this.findLocator(locatorValue).hover();
    }

    async selectValueFromDropdown(locatorValue: string, optionValue: string): Promise<void> {
        await this.findLocator(locatorValue).selectOption({ label: optionValue });
    }

    async fileUpload(locatorValue: string, filePath: string): Promise<void> {
        await this.findLocator(locatorValue).setInputFiles(filePath);
    }

    async scrollIntoViewIfNeeded(locatorValue: string): Promise<void> {
        await this.findLocator(locatorValue).scrollIntoViewIfNeeded();
    }

    async getVisibleText(locatorValue: string): Promise<string> {
        return await this.findLocator(locatorValue).innerText();
    }

    async getAttributeValue(locatorValue: string, attributeName: string): Promise<string | null> {
        return await this.findLocator(locatorValue).getAttribute(attributeName);
    }

    randomStringGenerator(text: string): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let randomPart = '';
        for (let i = 0; i < 5; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${text}_${randomPart}`;
    }

    getUserData() {
        return userData;
    }
}
