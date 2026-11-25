import { expect, Locator } from '@playwright/test';

export type SortDirection = 'Ascending' | 'Descending';

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

    // Matches OrangeHRM's MySQL case-insensitive character-code sorting (0-9 -> A-Z -> _)
    private static compare(a: string, b: string, direction: SortDirection): number {
        const valA = a.trim().toUpperCase();
        const valB = b.trim().toUpperCase();

        let result = 0;
        if (valA < valB) result = -1;
        else if (valA > valB) result = 1;

        return direction === 'Ascending' ? result : -result;
    }

    static isSorted(items: string[], direction: SortDirection): boolean {
        for (let i = 0; i < items.length - 1; i++) {
            if (this.compare(items[i], items[i + 1], direction) > 0) {
                return false;
            }
        }
        return true;
    }

    static verifySorted(items: string[], direction: SortDirection) {
        const expected = [...items].sort((a, b) => this.compare(a, b, direction));
        expect(items, `Expected items to be sorted in ${direction} order`).toEqual(expected);
    }
}
