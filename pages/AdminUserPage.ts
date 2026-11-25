import { Page, Locator, expect } from '@playwright/test';
import { PlaywrightActions } from '../utils/Actions';
import { AssertUtils, SortDirection } from '../utils/AssertUtils';
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

  // --- Data Helpers ---
  static pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
  }

  dynamicPassword(): string {
    return 'Test@' + this.randomStringGenerator('').slice(-4) + '12';
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

  async openDirect() {
    await this.page.goto('/web/index.php/admin/viewSystemUsers');
    await WaitUtils.waitForHidden(this.loader);
    await WaitUtils.waitForVisible(this.tableBody);
  }

  async resetSearch() {
    await this.clickOnElement(this.resetBtn);
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
    await WaitUtils.waitForHidden(this.loader);
    await AssertUtils.visible(this.saveBtn);
  }

  async openEditForm(username: string) {
    await this.searchUser(username);
    const row = this.getUserRow(username);
    await this.clickOnElement(row.locator('.bi-pencil-fill'));
    await WaitUtils.waitForHidden(this.loader);
    await AssertUtils.visible(this.saveBtn);
    // Wait until OrangeHRM finishes loading the existing username into the input field
    await expect(this.usernameInput).toHaveValue(username);
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
  // SEPARATE CRUD FUNCTIONS (Add User, Search User, Edit User, Delete User)
  // =========================================================================

  async addUser(customData?: Partial<UserPayload>): Promise<CreatedUser> {
    const data = this.getUserData();
    const employeeFirstName = await this.getExistingEmployeeFirstName();
    const role = customData?.userRole ?? AdminUserPage.pickRandom([data.roles.admin, data.roles.ess]);
    const status = customData?.status ?? data.statuses.enabled;
    const username = customData?.username ?? this.randomStringGenerator('test_add');
    const password = customData?.password ?? this.dynamicPassword();

    await this.openAddForm();
    await this.fillForm({
      userRole: role,
      employeeSearchText: customData?.employeeSearchText ?? employeeFirstName,
      status,
      username,
      password,
      confirmPassword: customData?.confirmPassword ?? password,
    });
    await this.saveForm();

    await AssertUtils.visible(this.toastSuccess);
    await WaitUtils.waitForHidden(this.loader);
    await WaitUtils.waitForVisible(this.tableBody);

    return { username, password, role, status };
  }

  async searchUser(username: string) {
    await this.enterText(this.searchUserInput, username);
    await this.clickOnElement(this.searchBtn);
    await WaitUtils.waitForHidden(this.loader);
  }

  async editUser(user: CreatedUser, updates?: Partial<UserPayload>): Promise<CreatedUser> {
    const data = this.getUserData();
    const newRole = updates?.userRole ?? (user.role === data.roles.admin ? data.roles.ess : data.roles.admin);
    const newStatus =
      updates?.status ?? (user.status === data.statuses.enabled ? data.statuses.disabled : data.statuses.enabled);
    const newUsername = updates?.username ?? this.randomStringGenerator('test_edit');

    await this.openEditForm(user.username);
    await this.fillForm({
userRole: newRole,
status: newStatus,
username: newUsername,
...updates,
});
await this.saveForm();
await AssertUtils.visible(this.toastSuccess);
await WaitUtils.waitForHidden(this.loader);
await WaitUtils.waitForVisible(this.tableBody);
return {
username: newUsername,
password: updates?.password ?? user.password,
role: newRole,
status: newStatus,
};
}
async deleteUser(username: string, confirm = true) {
await this.searchUser(username);
const row = this.getUserRow(username);
await this.clickOnElement(row.locator('.bi-trash'));
if (confirm) {
await this.clickOnElement(this.confirmDeleteBtn);
await AssertUtils.visible(this.toastSuccess);
await WaitUtils.waitForHidden(this.loader);
} else {
await this.clickOnElement(this.cancelDeleteBtn);
}
}
// =========================================================================
// VERIFICATION & VALIDATION HELPERS
// =========================================================================
async verifyUserInList(username: string, expectedRole?: string, expectedStatus?: string) {
await this.searchUser(username);
const row = this.getUserRow(username);
await AssertUtils.visible(row);
if (expectedRole) await AssertUtils.containsText(row, expectedRole);
if (expectedStatus) await AssertUtils.containsText(row, expectedStatus);
}
async verifyUserNotInList(username: string) {
await this.searchUser(username);
await AssertUtils.visible(this.noRecordsLabel);
}
async verifyErrorCount(expectedCount: number) {
await AssertUtils.count(this.errorLabels, expectedCount);
}
async verifyFieldError(labelText: string, expectedMessage: string) {
await AssertUtils.containsText(this.fieldError(labelText), expectedMessage);
}
async validateMandatoryFields() {
const data = this.getUserData();
await this.openAddForm();
await this.saveForm();
await this.verifyErrorCount(data.mandatoryFieldLabels.length);
for (const label of data.mandatoryFieldLabels) {
const expectedMsg =
label === 'Confirm Password'
? data.validationMessages.confirmPasswordRequired
: data.validationMessages.required;
await this.verifyFieldError(label, expectedMsg);
}
}
async validateInvalidInputs(existingUsername: string) {
const data = this.getUserData();
await this.openAddForm();
const scenarios: { payload: UserPayload; checks: { label: string; msg: string }[] }[] = [
{
payload: {
rawEmployee: this.randomStringGenerator('invalid'),
username: 'usr',
password: 'pass1',
confirmPassword: this.dynamicPassword(),
},
checks: [
{ label: 'Employee Name', msg: data.validationMessages.invalidEmployee },
{ label: 'Username', msg: data.validationMessages.minUsername },
{ label: 'Password', msg: data.validationMessages.minPassword },
{ label: 'Confirm Password', msg: data.validationMessages.passwordMismatch },
],
},
{
payload: { password: this.randomStringGenerator('PASS').toUpperCase() + '1' },
checks: [{ label: 'Password', msg: data.validationMessages.missingLowercasePassword }],
},
{
payload: { password: this.randomStringGenerator('TestPass').replace(/[0-9]/g, 'a') },
checks: [{ label: 'Password', msg: data.validationMessages.missingNumberPassword }],
},
{
payload: { username: existingUsername },
checks: [{ label: 'Username', msg: data.validationMessages.duplicateUsername }],
},
];
for (const s of scenarios) {
await this.fillForm(s.payload);
await this.saveForm();
for (const c of s.checks) {
await this.verifyFieldError(c.label, c.msg);
}
}
}
async validateDuplicateEditAndMismatch(user: CreatedUser, existingUsername: string) {
const data = this.getUserData();
await this.openEditForm(user.username);
await this.fillForm({
username: existingUsername,
enableChangePassword: true,
password: user.password,
confirmPassword: this.dynamicPassword(),
});
await this.saveForm();
await this.verifyFieldError('Username', data.validationMessages.duplicateUsername);
await this.verifyFieldError('Confirm Password', data.validationMessages.passwordMismatch);
await this.cancelForm();
}
// --- Sorting Helpers ---
private async applySort(order: SortDirection): Promise<string[]> {
await this.clickOnElement(this.sortBtn);
await WaitUtils.waitForDropdownVisible(this.sortDropdown);
await this.clickOnElement(this.sortDropdown.getByText(order, { exact: true }));
await WaitUtils.waitForHidden(this.loader);
return await this.getColumnTexts('Username');
}
async sortByUsername(order: SortDirection): Promise<string[]> {
const currentUsernames = await this.getColumnTexts('Username');
if (AssertUtils.isSorted(currentUsernames, order)) {
const oppositeOrder: SortDirection = order === 'Ascending' ? 'Descending' : 'Ascending';
await this.applySort(oppositeOrder);
}
return await this.applySort(order);
}
}