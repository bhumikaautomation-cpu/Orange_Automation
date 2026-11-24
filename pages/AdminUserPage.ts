import { Page, Locator } from '@playwright/test';
import { PlaywrightActions } from '../utils/Actions';
import { AssertUtils } from '../utils/AssertUtils';
import { WaitUtils } from '../utils/waitUtils';

export interface UserPayload {
    userRole?: string;
    employeeSearchText?: string;
    rawEmployee?: string;
    status?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    enableChangePassword?: boolean;
}

export interface CreatedUser {
    username: string;
    password: string;
    role: string;
    status: string;
}

export class AdminUserPage extends PlaywrightActions {
    // --- Navigation & Loaders ---
    loader = this.page.locator('.oxd-loading-spinner');
    adminLink = this.page.getByRole('navigation').getByRole('link', { name: 'Admin', exact: true });

    // --- Search & Action Buttons ---
    searchUserInput = this.getInputByLabel('Username');
    searchBtn = this.page.getByRole('button', { name: 'Search' });
    resetBtn = this.page.getByRole('button', { name: 'Reset' });
    addBtn = this.page.getByRole('button', { name: 'Add' });

    // --- System Users Table & Sorting ---
    tableBody = this.page.locator('.oxd-table-body');
    tableCards = this.tableBody.getByRole('row');
    noRecordsLabel = this.page.locator('.orangehrm-horizontal-padding').getByText('No Records Found');
    sortBtn = this.page.getByRole('columnheader', { name: /Username/i }).locator('.oxd-table-header-sort');
    sortDropdown = this.page.getByRole('menu');

    // --- Toasts & Confirmation Dialogs ---
    toastSuccess = this.page.locator('.oxd-toast--success');
    toastInfo = this.page.locator('.oxd-toast--info');
    cancelDeleteBtn = this.page.getByRole('dialog').getByRole('button', { name: 'No, Cancel' });
    confirmDeleteBtn = this.page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' });

    // --- Add / Edit User Form ---
    roleSelect = this.getDropdownByLabel('User Role');
    empInput = this.getInputByLabel('Employee Name');
    empDropdown = this.page.getByRole('listbox');
    empOptions = this.empDropdown.getByRole('option');
    empSearching = this.empOptions.filter({ hasText: 'Searching' });
    statusSelect = this.getDropdownByLabel('Status');
    usernameInput = this.getInputByLabel('Username');
    changePasswordCheckbox = this.page.locator('label').filter({ hasText: 'Yes' });
    passwordInput = this.getInputByLabel('Password');
    confirmInput = this.getInputByLabel('Confirm Password');
    saveBtn = this.page.getByRole('button', { name: 'Save' });
    cancelBtn = this.page.getByRole('button', { name: 'Cancel' });
    errorLabels = this.page.locator('.oxd-input-field-error-message');

    constructor(page: Page) {
        super(page);
    }

    // --- Dynamic Locator Helpers ---
    private getFieldContainer(labelText: string): Locator {
        return this.page.locator('.oxd-input-group').filter({
            has: this.page.locator('label', { hasText: new RegExp(`^${labelText}$`) }),
        });
    }

    private getInputByLabel(labelText: string): Locator {
        return this.getFieldContainer(labelText).locator('input');
    }

    private getDropdownByLabel(labelText: string): Locator {
        return this.getFieldContainer(labelText).locator('.oxd-select-text');
    }

    private fieldError(labelText: string): Locator {
        return this.getFieldContainer(labelText).locator('.oxd-input-field-error-message');
    }

    private getUserRow(username: string): Locator {
        return this.tableCards.filter({ hasText: username });
    }

    // --- Static Data Helpers ---
    static pickRandom<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)]!;
    }

    static dynamicPassword(): string {
        return (
            PlaywrightActions.generateRandom('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2) +
            PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz', 4) +
            PlaywrightActions.generateRandom('0123456789', 2) +
            '@'
        );
    }

    // --- Low-Level Form & Table Helpers ---
    async selectCustomDropdown(trigger: Locator, optionText: string) {
        await this.clickOnElement(trigger);
        const option = this.page.getByRole('option', { name: optionText, exact: true });
        await WaitUtils.waitForDropdownVisible(option);
        await option.click();
    }

    async selectExistingEmployee(searchText: string) {
        await this.enterText(this.empInput, searchText);
        await WaitUtils.waitForHidden(this.empSearching);
        await WaitUtils.waitForDropdownVisible(this.empDropdown);

        const validOptions: Locator[] = [];
        for (const opt of await this.empOptions.all()) {
            const txt = (await opt.innerText()).trim();
            if (txt && txt !== 'No Records Found' && !txt.includes('Searching')) {
                validOptions.push(opt);
            }
        }
        await AdminUserPage.pickRandom(validOptions).click();
    }

    async getColumnTexts(columnName: 'Username' | 'User Role' | 'Employee Name' | 'Status'): Promise<string[]> {
        await WaitUtils.waitForHidden(this.loader);

        const headers = await this.page.getByRole('columnheader').allInnerTexts();
        const columnIndex = headers.findIndex((header) => header.trim().startsWith(columnName));

        return this.tableCards.evaluateAll(
            (rows, idx) =>
                rows
                    .map((row) => row.querySelectorAll('[role="cell"]')[idx]?.textContent?.trim() ?? '')
                    .filter(Boolean),
            columnIndex
        );
    }

    async navigate() {
        await this.clickOnElement(this.adminLink);
        await WaitUtils.waitForHidden(this.loader);
        await WaitUtils.waitForVisible(this.tableBody);
    }

    async getExistingUsername(): Promise<string> {
        await WaitUtils.waitForVisible(this.tableCards.first());
        const usernames = await this.getColumnTexts('Username');
        return AdminUserPage.pickRandom(usernames) || 'Admin';
    }


    async getExistingEmployeeFirstName(): Promise<string> {
        let employees = await this.getColumnTexts('Employee Name');
        if (employees.length === 0) {
            await this.resetSearch();
            employees = await this.getColumnTexts('Employee Name');
        }
        const emp = AdminUserPage.pickRandom(employees);
        return emp.split(' ')[0] ?? emp;
    }


    async openAddForm() {
        await this.clickOnElement(this.addBtn);
        await AssertUtils.visible(this.saveBtn);
    }

    async openEditForm(username: string) {
        await this.searchUser(username);
        const row = this.getUserRow(username);
        await this.clickOnElement(row.locator('.bi-pencil-fill'));
        await WaitUtils.waitForHidden(this.loader);
        await AssertUtils.visible(this.saveBtn);
        await this.usernameInput.waitFor({ state: 'visible' });
        await WaitUtils.waitForHidden(this.loader);
    }

    async saveForm() {
        await this.clickOnElement(this.saveBtn);
    }

    async cancelForm() {
        await this.clickOnElement(this.cancelBtn);
        await WaitUtils.waitForHidden(this.loader);
        await WaitUtils.waitForVisible(this.tableBody);
    }

    async fillForm(data: UserPayload) {
        if (data.userRole) await this.selectCustomDropdown(this.roleSelect, data.userRole);
        if (data.employeeSearchText) await this.selectExistingEmployee(data.employeeSearchText);
        if (data.rawEmployee !== undefined) await this.enterText(this.empInput, data.rawEmployee);
        if (data.status) await this.selectCustomDropdown(this.statusSelect, data.status);
        if (data.username !== undefined) await this.enterText(this.usernameInput, data.username);

        if (data.enableChangePassword) {
            await this.clickOnElement(this.changePasswordCheckbox);
            await WaitUtils.waitForVisible(this.passwordInput);
        }

        if (data.password !== undefined) await this.enterText(this.passwordInput, data.password);
        if (data.confirmPassword !== undefined) await this.enterText(this.confirmInput, data.confirmPassword);
    }

    // =========================================================================
    // HIGH-LEVEL CRUD ACTIONS (Used directly in spec files without payloads)
    // =========================================================================

    async addUser(overrides: Partial<UserPayload> = {}): Promise<CreatedUser> {
        const data = this.getUserData();
        const role = overrides.userRole ?? AdminUserPage.pickRandom(Object.values(data.roles));
        const status = overrides.status ?? AdminUserPage.pickRandom(Object.values(data.statuses));
        const employeeSearchText = overrides.employeeSearchText ?? (await this.getExistingEmployeeFirstName());
        const username = overrides.username ?? this.randomStringGenerator('btest');
        const password = overrides.password ?? AdminUserPage.dynamicPassword();

        await this.openAddForm();
        await this.fillForm({
            userRole: role,
            employeeSearchText,
            status,
            username,
            password,
            confirmPassword: overrides.confirmPassword ?? password,
        });
        await this.saveForm();
        await this.verifySuccessToast();

        return { username, password, role, status };
    }

    async editUser(currentUser: CreatedUser, overrides: Partial<UserPayload> = {}): Promise<CreatedUser> {
        const data = this.getUserData();
        const updatedRole =
            overrides.userRole ??
            AdminUserPage.pickRandom(Object.values(data.roles).filter((r) => r !== currentUser.role));
        const updatedStatus =
            overrides.status ??
            AdminUserPage.pickRandom(Object.values(data.statuses).filter((s) => s !== currentUser.status));
        const updatedUsername = overrides.username ?? this.randomStringGenerator('btest');
        const updatedPassword = overrides.password ?? AdminUserPage.dynamicPassword();

        await this.openEditForm(currentUser.username);
        await this.fillForm({
            userRole: updatedRole,
            status: updatedStatus,
            username: updatedUsername,
            enableChangePassword: overrides.enableChangePassword ?? true,
            password: updatedPassword,
            confirmPassword: overrides.confirmPassword ?? updatedPassword,
        });
        await this.saveForm();
        await this.verifySuccessToast();

        return {
            username: updatedUsername,
            password: updatedPassword,
            role: updatedRole,
            status: updatedStatus,
        };
    }


    async searchUser(username: string) {
        await this.enterText(this.searchUserInput, username);
        await this.clickOnElement(this.searchBtn);
        await WaitUtils.waitForHidden(this.loader);
    }

    async resetSearch() {
        await this.clickOnElement(this.resetBtn);
        await WaitUtils.waitForHidden(this.loader);
        await WaitUtils.waitForVisible(this.tableBody);
    }

    async deleteUser(username: string, confirm = true) {
        await this.searchUser(username);
        const row = this.getUserRow(username);
        await this.clickOnElement(row.locator('.bi-trash'));
        await AssertUtils.visible(this.confirmDeleteBtn);

        if (confirm) {
            await this.clickOnElement(this.confirmDeleteBtn);
            await this.verifySuccessToast(); // Check toast immediately before it disappears
            await WaitUtils.waitForHidden(this.loader);
        } else {
            await this.clickOnElement(this.cancelDeleteBtn);
        }
    }

    async sortByUsername(order: 'Ascending' | 'Descending'): Promise<string[]> {
        await this.clickOnElement(this.sortBtn);
        await WaitUtils.waitForVisible(this.sortDropdown);
        await this.clickOnElement(this.sortDropdown.getByText(order, { exact: true }));
        await WaitUtils.waitForHidden(this.loader);
        return this.getColumnTexts('Username');
    }
    // --- Page Assertions ---
    async verifySuccessToast() {
        await AssertUtils.visible(this.toastSuccess);
    }
    async verifyErrorCount(expectedCount: number) {
        await AssertUtils.count(this.errorLabels, expectedCount);
    }
    async verifyFieldError(labelText: string, expectedMessage: string) {
        await AssertUtils.exactText(this.fieldError(labelText), expectedMessage);
    }
    async verifyUserInList(username: string, role: string, status: string) {
        await this.searchUser(username);
        const row = this.getUserRow(username);
        await AssertUtils.visible(row);
        await AssertUtils.containsText(row, role);
        await AssertUtils.containsText(row, status);
    }
    async verifyUserNotInList(username: string) {
        await this.searchUser(username);
        await AssertUtils.visible(this.noRecordsLabel);
    }
}