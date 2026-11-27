import { expect, Locator } from '@playwright/test';

export type SortDirection = 'Ascending' | 'Descending';

export class AssertUtils {
    static async visible(locator: Locator) {
        await expect(locator).toBeVisible();
    }

    static async exactText(locator: Locator, expectedText: string) {
        await expect(locator).toHaveText(expectedText);
    }

    static async containsText(locator: Locator, expectedSubstring: string) {
        await expect(locator).toContainText(expectedSubstring);
    }

    static async count(locator: Locator, expectedCount: number) {
        await expect(locator).toHaveCount(expectedCount);
    }

    // Matches OrangeHRM's MySQL case-insensitive character-code sorting (0-9 -> A-Z -> _)
    private static compare(firstValue: string, secondValue: string, direction: SortDirection): number {
        const normalizedFirstValue = firstValue.trim().toUpperCase();
        const normalizedSecondValue = secondValue.trim().toUpperCase();

        let comparisonOrder = 0;
        if (normalizedFirstValue < normalizedSecondValue) comparisonOrder = -1;
        else if (normalizedFirstValue > normalizedSecondValue) comparisonOrder = 1;

        return direction === 'Ascending' ? comparisonOrder : -comparisonOrder;
    }

    static isSorted(items: string[], direction: SortDirection): boolean {
        for (let index = 0; index < items.length - 1; index++) {
            const currentItem = items[index];
            const nextItem = items[index + 1];

            if (this.compare(currentItem, nextItem, direction) > 0) {
                return false;
            }
        }
        return true;
    }

    static verifySorted(actualItems: string[], direction: SortDirection) {
        const expectedSortedItems = [...actualItems].sort((firstItem, secondItem) =>
            this.compare(firstItem, secondItem, direction)
        );
        expect(actualItems, `Expected items to be sorted in ${direction} order`).toEqual(expectedSortedItems);
    }
}
