import { expect, Locator } from '@playwright/test';

export class AssertUtils {
    static async visible(locator: Locator) {
        await expect(locator).toBeVisible();
    }

    static async exactText(locator: Locator, text: string) {
        await expect(locator).toHaveText(text);
    }

    static async containsText(locator: Locator, text: string) {
        await expect(locator).toContainText(text);
    }

    static async count(locator: Locator, expected: number) {
        await expect(locator).toHaveCount(expected);
    }

    static verifySorted(names: string[], direction: 'Ascending' | 'Descending') {
        const actual = names.map((name) => name.toLowerCase());
        const sortedNames = [...actual].sort();

        if (direction === 'Descending') {
            sortedNames.reverse();
        }

        expect(actual).toEqual(sortedNames);
    }
}
