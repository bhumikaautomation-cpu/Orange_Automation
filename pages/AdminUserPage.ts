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
  // --- Stored Dynamic State ---
  private _generatedPassword: string = '';

  // --- Navigation & Loaders ---
  loader = this.page.locator('.oxd-loading-spinner');
  adminLink = this.page.getByRole('navigation').getByRole('link', { name: 'Admin', exact: true });

  // --- Dynamic Field & Row Locators ---
  fieldContainer = (labelText: string) =>
    this.page.locator('.oxd-input-group').filter({
      has: this.page.locator('label', { hasText: new RegExp(`^${labelText}$`) }),
    });
  inputByLabel = (labelText: string) => this.fieldContainer(labelText).locator('input');
  dropdownByLabel = (labelText: string) => this.fieldContainer(labelText).locator('.oxd-select-text');
  fieldError = (labelText: string) => this.fieldContainer(labelText).locator('.oxd-input-field-error-message');
  userRow = (username: string) => this.tableCards.filter({ hasText: username });
  editRowBtn = (username: string) => this.userRow(username).locator('.bi-pencil-fill');
  deleteRowBtn = (username: string) => this.userRow(username).locator('.bi-trash');
  dropdownOption = (optionText: string) => this.page.getByRole('option', { name: optionText, exact: true });

  // --- Search & Action Buttons ---
  filterToggleBtn = this.page.locator('.oxd-table-filter-header-options button');
  searchUserInput = this.inputByLabel('Username');
  searchBtn = this.page.getByRole('button', { name: 'Search' });
  resetBtn = this.page.getByRole('button', { name: 'Reset' });
  addBtn = this.page.getByRole('button', { name: 'Add' });

  // --- System Users Table & Sorting (Scoped to table container) ---
  usersTable = this.page.locator('.oxd-table');
  tableHeaders = this.usersTable.getByRole('columnheader');
  tableBody = this.usersTable.locator('.oxd-table-body');
  tableCards = this.tableBody.getByRole('row');
  noRecordsLabel = this.page.locator('.orangehrm-horizontal-padding').getByText('No Records Found');
  sortBtn = this.usersTable.getByRole('columnheader', { name: /Username/i }).locator('.oxd-table-header-sort');
  sortDropdown = this.page.getByRole('menu');
  sortOption = (order: SortDirection) => this.sortDropdown.getByText(order, { exact: true });

  // --- Toasts & Confirmation Dialogs ---
  toastSuccess = this.page.locator('.oxd-toast--success');
  toastInfo = this.page.locator('.oxd-toast--info');
  cancelDeleteBtn = this.page.getByRole('dialog').getByRole('button', { name: 'No, Cancel' });
  confirmDeleteBtn = this.page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' });

  // --- Add / Edit User Form ---
  roleSelect = this.dropdownByLabel('User Role');
  empInput = this.inputByLabel('Employee Name');
  empDropdown = this.page.getByRole('listbox');
  empOptions = this.empDropdown.getByRole('option');
  empSearching = this.empOptions.filter({ hasText: 'Searching' });
  statusSelect = this.dropdownByLabel('Status');
  usernameInput = this.inputByLabel('Username');
  changePasswordCheckbox = this.page.locator('label').filter({ hasText: 'Yes' });
  passwordInput = this.inputByLabel('Password');
  confirmInput = this.inputByLabel('Confirm Password');
  saveBtn = this.page.getByRole('button', { name: 'Save' });
  cancelBtn = this.page.getByRole('button', { name: 'Cancel' });
  errorLabels = this.page.locator('.oxd-input-field-error-message');

  constructor(page: Page) {
    super(page);
  }

  /**
   * Generates a dynamic password using PlaywrightActions.generateRandom
   * and explicitly stores it so it can be reused anywhere later.
   */
  dynamicPassword(): string {
    const randomChars = PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz', 4);
    this._generatedPassword = `Test@${randomChars}12`;
    return this._generatedPassword;
  }

  get storedPassword(): string {
    return this._generatedPassword;
  }

  // --- Low-Level Form & Table Helpers ---
  async selectCustomDropdown(trigger: Locator, optionText: string) {
    await this.clickOnElement(trigger);
    const option = this.dropdownOption(optionText);
    await WaitUtils.waitForDropdownVisible(option);
    await option.click();
  }

  async selectExistingEmployee(searchText: string) {
    await this.enterText(this.empInput, searchText);
    await WaitUtils.waitForHidden(this.empSearching);
    await WaitUtils.waitForDropdownVisible(this.empDropdown);

    const validOptions: Locator[] = [];
    for (const option of await this.empOptions.all()) {
      const optionText = (await option.innerText()).trim();
      if (optionText && optionText !== 'No Records Found' && !optionText.includes('Searching')) {
        validOptions.push(option);
      }
    }

    if (validOptions.length === 0 && searchText !== 'e') {
      await this.selectExistingEmployee('e');
      return;
    }

    await this.pickRandom(validOptions).click();
  }

  async getColumnTexts(columnName: 'Username' | 'User Role' | 'Employee Name' | 'Status'): Promise<string[]> {
    await WaitUtils.waitForHidden(this.loader);
    const headers = await this.tableHeaders.allInnerTexts();
    const columnIndex = headers.findIndex((header) => header.trim().startsWith(columnName));

    if (columnIndex === -1) return [];

    return this.tableCards.evaluateAll(
      (rows, targetColumnIndex) =>
        rows
          .map((row) => row.querySelectorAll('[role="cell"]')[targetColumnIndex]?.textContent?.trim() ?? '')
          .filter(Boolean),
      columnIndex
    );
  }

  async navigate() {
    // Opens baseURL
    if (!this.page.url().includes('orangehrmlive.com')) {
      await this.openWebsite('/');
      await WaitUtils.waitForHidden(this.loader);
    }

    // Navigate step-by-step via the Admin sidebar menu
    if (!this.page.url().includes('/admin/viewSystemUsers')) {
      await this.clickOnElement(this.adminLink);
    }

    await WaitUtils.waitForHidden(this.loader);
    await WaitUtils.waitForVisible(this.tableBody);
    await expect(this.tableCards.first().or(this.noRecordsLabel)).toBeVisible();
  }

  async ensureOnListPage() {
    await WaitUtils.waitForHidden(this.loader);
    if (!this.page.url().includes('/admin/viewSystemUsers') || !(await this.addBtn.isVisible())) {
      await this.navigate();
    }
  }

  async ensureSearchFiltersExpanded() {
    await this.ensureOnListPage();
    if (!(await this.searchUserInput.isVisible())) {
      await this.clickOnElement(this.filterToggleBtn);
      await WaitUtils.waitForVisible(this.searchUserInput);
    }
  }

  async resetSearch() {
    await this.ensureSearchFiltersExpanded();
    await this.clickOnElement(this.resetBtn);
    await WaitUtils.waitForHidden(this.loader);
    await expect(this.tableCards.first().or(this.noRecordsLabel)).toBeVisible();
  }

  async getExistingUsername(): Promise<string> {
    await this.ensureOnListPage();
    await WaitUtils.waitForVisible(this.tableCards.first());
    const usernames = await this.getColumnTexts('Username');
    return this.pickRandom(usernames) || 'Admin';
  }

  async openAddForm() {
    await this.ensureOnListPage();
    await this.clickOnElement(this.addBtn);
    await WaitUtils.waitForHidden(this.loader);
    await AssertUtils.visible(this.saveBtn);
  }

  async openEditForm(username: string) {
    await this.searchUser(username);
    await this.clickOnElement(this.editRowBtn(username));
    await WaitUtils.waitForHidden(this.loader);
    await AssertUtils.visible(this.saveBtn);
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

  async fillForm(userData: UserPayload) {
    if (userData.userRole) await this.selectCustomDropdown(this.roleSelect, userData.userRole);
    if (userData.employeeSearchText) await this.selectExistingEmployee(userData.employeeSearchText);
    if (userData.rawEmployee !== undefined) await this.enterText(this.empInput, userData.rawEmployee);
    if (userData.status) await this.selectCustomDropdown(this.statusSelect, userData.status);
    if (userData.username !== undefined) await this.enterText(this.usernameInput, userData.username);

    if (userData.enableChangePassword) {
      await this.clickOnElement(this.changePasswordCheckbox);
      await WaitUtils.waitForVisible(this.passwordInput);
    }

    if (userData.password !== undefined) await this.enterText(this.passwordInput, userData.password);
    if (userData.confirmPassword !== undefined) await this.enterText(this.confirmInput, userData.confirmPassword);
  }

  // =========================================================================
  // SEPARATE CRUD FUNCTIONS (Add User, Search User, Edit User, Delete User)
  // =========================================================================

  async addUser(customData?: Partial<UserPayload>): Promise<CreatedUser> {
    const defaultUserData = this.getUserData();
    const role = customData?.userRole ?? this.pickRandom([defaultUserData.roles.admin, defaultUserData.roles.ess]);
    const status = customData?.status ?? defaultUserData.statuses.enabled;
    const randomSuffix = PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz', 5);
    const username = customData?.username ?? `test_add_${randomSuffix}`;
const password = customData?.password ?? this.dynamicPassword();
await this.openAddForm();
await this.fillForm({
userRole: role,
employeeSearchText: customData?.employeeSearchText ?? 'a',
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
await this.ensureSearchFiltersExpanded();
await this.enterText(this.searchUserInput, username);
await this.clickOnElement(this.searchBtn);
await WaitUtils.waitForHidden(this.loader);
}
async editUser(existingUser: CreatedUser, updates?: Partial<UserPayload>): Promise<CreatedUser> {

const { roles, statuses } = this.getUserData();
const { admin, ess } = roles;
const { enabled, disabled } = statuses;
const newRole = updates?.userRole ?? (existingUser.role === admin ? ess : admin);
const newStatus = updates?.status ?? (existingUser.status === enabled ? disabled : enabled);
const randomSuffix = PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz', 5);
const newUsername = updates?.username ?? `test_edit_${randomSuffix}`;
await this.openEditForm(existingUser.username);
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
password: updates?.password ?? existingUser.password,
role: newRole,
status: newStatus,
};
}
async deleteUser(username: string, confirmDelete = true) {
await this.searchUser(username);
await this.clickOnElement(this.deleteRowBtn(username));
if (confirmDelete) {
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
const userRow = this.userRow(username);
await AssertUtils.visible(userRow);
if (expectedRole) await AssertUtils.containsText(userRow, expectedRole);
if (expectedStatus) await AssertUtils.containsText(userRow, expectedStatus);
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
const validationData = this.getUserData();
await this.openAddForm();
await this.passwordInput.fill('a');
await this.passwordInput.fill('');
await this.confirmInput.fill('a');
await this.confirmInput.fill('');
await this.confirmInput.blur();
await this.saveForm();
await this.verifyErrorCount(validationData.mandatoryFieldLabels.length);
for (const fieldLabel of validationData.mandatoryFieldLabels) {
const expectedMessage =
fieldLabel === 'Confirm Password'
? validationData.validationMessages.confirmPasswordRequired
: validationData.validationMessages.required;
await this.verifyFieldError(fieldLabel, expectedMessage);
}
}
async validateInvalidInputs(existingUsername: string) {
const validationData = this.getUserData();
await this.openAddForm();
const invalidEmployeeSuffix = PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz', 5);
const invalidScenarios: { payload: UserPayload; checks: { label: string; message: string }[] }[] = [
{
payload: {
rawEmployee: `invalid_${invalidEmployeeSuffix}`,
username: 'usr',
password: 'pass1',
confirmPassword: this.dynamicPassword(),
},
checks: [
{ label: 'Employee Name', message: validationData.validationMessages.invalidEmployee },
{ label: 'Username', message: validationData.validationMessages.minUsername },
{ label: 'Password', message: validationData.validationMessages.minPassword },
{ label: 'Confirm Password', message: validationData.validationMessages.passwordMismatch },
],
},
{
payload: { password: PlaywrightActions.generateRandom('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6) + '1' },
checks: [{ label: 'Password', message: validationData.validationMessages.missingLowercasePassword }],
},
{
payload: { password: PlaywrightActions.generateRandom('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8) },
checks: [{ label: 'Password', message: validationData.validationMessages.missingNumberPassword }],
},
{
payload: { username: existingUsername },
checks: [{ label: 'Username', message: validationData.validationMessages.duplicateUsername }],
},
];
for (const scenario of invalidScenarios) {
await this.fillForm(scenario.payload);
await this.saveForm();
for (const validationCheck of scenario.checks) {
await this.verifyFieldError(validationCheck.label, validationCheck.message);
}
}
}
async validateDuplicateEditAndMismatch(existingUser: CreatedUser, duplicateUsername: string) {
const validationData = this.getUserData();
await this.openEditForm(existingUser.username);
await this.fillForm({
username: duplicateUsername,
enableChangePassword: true,
password: existingUser.password,
confirmPassword: this.dynamicPassword(),
});
await this.saveForm();
await this.verifyFieldError('Username', validationData.validationMessages.duplicateUsername);
await this.verifyFieldError('Confirm Password', validationData.validationMessages.passwordMismatch);
await this.cancelForm();
}
// --- Sorting Helpers ---
private async applySort(sortOrder: SortDirection): Promise<string[]> {
await this.clickOnElement(this.sortBtn);
await WaitUtils.waitForDropdownVisible(this.sortDropdown);
await this.clickOnElement(this.sortOption(sortOrder));
await WaitUtils.waitForHidden(this.loader);
return await this.getColumnTexts('Username');
}
async sortByUsername(sortOrder: SortDirection): Promise<string[]> {
await this.ensureOnListPage();
const currentUsernames = await this.getColumnTexts('Username');
if (AssertUtils.isSorted(currentUsernames, sortOrder)) {
const oppositeOrder: SortDirection = sortOrder === 'Ascending' ? 'Descending' : 'Ascending';
await this.applySort(oppositeOrder);
}
return await this.applySort(sortOrder);
}
}