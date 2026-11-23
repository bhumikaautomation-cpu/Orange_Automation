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
}

export class AdminUserPage extends PlaywrightActions {
    loader = '.oxd-loading-spinner';
    adminLink = 'a[href*="viewAdminModule"]';
    addBtn = 'button:has-text("Add")';
    searchUserInput = '.oxd-input-group:has(label:has-text("Username")) input';
    searchBtn = 'button[type="submit"]:has-text("Search")';
    tableBody = '.oxd-table-body';
    tableUserCells = '.oxd-table-body .oxd-table-card .oxd-table-cell:nth-child(2)';
    tableEmployeeCells = '.oxd-table-body .oxd-table-card .oxd-table-cell:nth-child(4)';
    sortBtn = '.oxd-table-header-cell:has-text("Username") .oxd-table-header-sort';
    sortDropdown = '.oxd-table-header-sort-dropdown.--active';
    toastSuccess = '.oxd-toast--success';

    roleSelect = '.oxd-input-group:has(label:has-text("User Role")) .oxd-select-text';
    empInput = '.oxd-input-group:has(label:has-text("Employee Name")) input';
    empSearching = '.oxd-autocomplete-option:has-text("Searching")';
    empDropdown = '.oxd-autocomplete-dropdown';
    empOptions = '.oxd-autocomplete-dropdown .oxd-autocomplete-option';
    statusSelect = '.oxd-input-group:has(label:has-text("Status")) .oxd-select-text';
    usernameInput = '.oxd-input-group:has(label:has-text("Username")) input';
    passwordInput = '.oxd-input-group:has(label:text-is("Password")) input';
    confirmInput = '.oxd-input-group:has(label:has-text("Confirm Password")) input';
    saveBtn = 'button[type="submit"]:has-text("Save")';
    errorLabels = '.oxd-input-field-error-message';

    constructor(page: Page) {
        super(page);
    }

    static randomm(chars: string, length: number) {
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result = result + chars[randomIndex];
  }

  return result;
}


    static pickRandom<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    static dynamicPassword() {
        return (
            this.randomm('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2) +
            this.randomm('abcdefghijklmnopqrstuvwxyz', 4) +
            this.randomm('0123456789', 2) +
            '@'
        );
    }

    static shortString(len = 4) {
        return this.randomm('abcdefghijklmnopqrstuvwxyz0123456789', len);
    }

    static passwordNoLowercase(len = 8) {
        return this.randomm('ABCDEFGHIJKLMNOPQRSTUVWXYZ', len - 2) + this.randomm('0123456789', 2);
    }

    static passwordNoNumber(len = 8) {
        return this.randomm('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2) + this.randomm('abcdefghijklmnopqrstuvwxyz', len - 2);
    }

    async selectCustomDropdown(trigger: string, optionText: string) {
        await this.clickOnElement(trigger);
        const option = this.page.getByRole('option', { name: optionText, exact: true });
        await WaitUtils.waitForDropdownVisible(option);
        await option.click();
    }

    async selectExistingEmployee(searchText: string) {
        await this.enterText(this.empInput, searchText);
        await WaitUtils.waitForHidden(this.findLocator(this.empSearching));
        await WaitUtils.waitForDropdownVisible(this.findLocator(this.empDropdown));

        const validOptions: Locator[] = [];
        for (const opt of await this.findLocator(this.empOptions).all()) {
            const txt = (await opt.innerText()).trim();
            if (txt && txt !== 'No Records Found' && !txt.includes('Searching')) validOptions.push(opt);
        }
        await AdminUserPage.pickRandom(validOptions).click();
    }

    async getAllCellTexts(selector: string) {
        await WaitUtils.waitForHidden(this.findLocator(this.loader));
        const list: string[] = [];
        for (const cell of await this.findLocator(selector).all()) {
            const val = (await cell.innerText()).trim();
            if (val) list.push(val);
        }
        return list;
    }

    async navigate() {
        await this.clickOnElement(this.adminLink);
        await WaitUtils.waitForHidden(this.findLocator(this.loader));
        await WaitUtils.waitForVisible(this.findLocator(this.tableBody));
    }

    async getExistingUsername() {
        return AdminUserPage.pickRandom(await this.getAllCellTexts(this.tableUserCells));
    }

    async getExistingEmployeeFirstName() {
        const emp = AdminUserPage.pickRandom(await this.getAllCellTexts(this.tableEmployeeCells));
        return emp.split(' ')[0];
    }

    async openAddForm() {
        await this.clickOnElement(this.addBtn);
        await AssertUtils.visible(this.findLocator(this.saveBtn));
    }

    async submit() {
        await this.clickOnElement(this.saveBtn);
    }

    fieldError(label: string) {
        return this.findLocator(`.oxd-input-group:has(label:text-is("${label}")) .oxd-input-field-error-message`);
    }

    async fillForm(data: UserPayload) {
        if (data.userRole) await this.selectCustomDropdown(this.roleSelect, data.userRole);
        if (data.employeeSearchText) await this.selectExistingEmployee(data.employeeSearchText);
        if (data.rawEmployee !== undefined) await this.enterText(this.empInput, data.rawEmployee);
        if (data.status) await this.selectCustomDropdown(this.statusSelect, data.status);
        if (data.username !== undefined) await this.enterText(this.usernameInput, data.username);
        if (data.password !== undefined) await this.enterText(this.passwordInput, data.password);
        if (data.confirmPassword !== undefined) await this.enterText(this.confirmInput, data.confirmPassword);
    }

    async verifyUserInList(username: string, role: string, status: string) {
        await WaitUtils.waitForHidden(this.findLocator(this.loader));
        await this.enterText(this.searchUserInput, username);
        await this.clickOnElement(this.searchBtn);
        await WaitUtils.waitForHidden(this.findLocator(this.loader));

        const row = this.findLocator(`.oxd-table-body .oxd-table-card:has-text("${username}")`);
        await AssertUtils.visible(row);
        await AssertUtils.containsText(row, role);
        await AssertUtils.containsText(row, status);
    }

    async sortByUsername(order: 'Ascending' | 'Descending') {
        await this.clickOnElement(this.sortBtn);
        await WaitUtils.waitForDropdownVisible(this.findLocator(this.sortDropdown));
        await this.clickOnElement(`${this.sortDropdown} span:has-text("${order}")`);
        await WaitUtils.waitForHidden(this.findLocator(this.loader));
        //await this.page.waitForTimeout(10000);
        return this.getAllCellTexts(this.tableUserCells);
        /* const sortedUsernames = await this.getAllCellTexts(this.tableUserCells);
    console.log(`Sorted (${order}):`, sortedUsernames);
    return sortedUsernames;*/
    }

    async deleteUser(username: string) {
        await this.clickOnElement(`.oxd-table-body .oxd-table-card:has-text("${username}") button:has(.bi-trash)`);
        await this.clickOnElement('.oxd-dialog-container-default button:has-text("Yes, Delete")');
        await AssertUtils.visible(this.findLocator(this.toastSuccess));
    }
}
