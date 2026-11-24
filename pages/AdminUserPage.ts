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
  enableChangePassword?: boolean; // [NEW] Task-2 Unlocks Password fields on the Edit User page
}

export class AdminUserPage extends PlaywrightActions {
  loader = '.oxd-loading-spinner';
  adminLink = 'a[href*="viewAdminModule"]';
  addBtn = 'button:has-text("Add")';
  searchUserInput = '.oxd-input-group:has(label:has-text("Username")) input';
  searchBtn = 'button[type="submit"]:has-text("Search")';
  resetBtn = 'button:has-text("Reset")'; // Task-2 [NEW] Reset search button
  tableBody = '.oxd-table-body';
  tableCards = '.oxd-table-body .oxd-table-card'; // Task-2 [NEW] Table rows locator
  tableUserCells = '.oxd-table-body .oxd-table-card .oxd-table-cell:nth-child(2)';
  tableEmployeeCells = '.oxd-table-body .oxd-table-card .oxd-table-cell:nth-child(4)';
  noRecordsLabel = 'span:has-text("No Records Found")'; // Task-2 [NEW] Shown when deleted/unknown user is searched
  sortBtn = '.oxd-table-header-cell:has-text("Username") .oxd-table-header-sort';
  sortDropdown = '.oxd-table-header-sort-dropdown.--active';
  toastSuccess = '.oxd-toast--success';
  toastInfo = '#oxd-toaster_1'; // Task-2 [NEW] Info toast shown on "No Records Found"

  roleSelect = '.oxd-input-group:has(label:has-text("User Role")) .oxd-select-text';
  empInput = '.oxd-input-group:has(label:has-text("Employee Name")) input';
  empSearching = '.oxd-autocomplete-option:has-text("Searching")';
  empDropdown = '.oxd-autocomplete-dropdown';
  empOptions = '.oxd-autocomplete-dropdown .oxd-autocomplete-option';
  statusSelect = '.oxd-input-group:has(label:has-text("Status")) .oxd-select-text';
  usernameInput = '.oxd-input-group:has(label:has-text("Username")) input';
  changePasswordCheckbox = '.oxd-checkbox-input'; // Task-2 [NEW] Checkbox on Edit User screen
  passwordInput = '.oxd-input-group:has(label:text-is("Password")) input';
  confirmInput = '.oxd-input-group:has(label:has-text("Confirm Password")) input';
  saveBtn = 'button[type="submit"]:has-text("Save")';
  cancelBtn = 'button:has-text("Cancel")'; // Task-2 [NEW] Cancel button on Add/Edit form
  errorLabels = '.oxd-input-field-error-message';
  cancelDeleteBtn = '.oxd-dialog-container-default button:has-text("No, Cancel")'; // Task-2 [NEW] Cancel delete popup
  confirmDeleteBtn = '.oxd-dialog-container-default button:has-text("Yes, Delete")'; // Task-2[NEW] Confirm delete popup

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

  // Task-2 [NEW] Click Cancel on Add/Edit form to discard changes
  async cancelForm() {
    await this.clickOnElement(this.cancelBtn);
    await WaitUtils.waitForHidden(this.findLocator(this.loader));
    await WaitUtils.waitForVisible(this.findLocator(this.tableBody));
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

    // Task-2  [NEW] Clicks "Change Password" checkbox on Edit screen before filling new passwords
    if (data.enableChangePassword) {
      await this.clickOnElement(this.changePasswordCheckbox);
      await WaitUtils.waitForVisible(this.findLocator(this.passwordInput));
    }

    if (data.password !== undefined) await this.enterText(this.passwordInput, data.password);
    if (data.confirmPassword !== undefined) await this.enterText(this.confirmInput, data.confirmPassword);
  }

  // Task-2 [NEW] Searches by Username in the System Users search bar
 async searchUser(username: string) {
  await this.enterText(this.searchUserInput, username);
  await this.clickOnElement(this.searchBtn);
  await WaitUtils.waitForHidden(this.findLocator(this.loader), 20000);
}


  // Task-2 [NEW] Clicks Reset to clear search filters
  async resetSearch() {
    await this.clickOnElement(this.resetBtn);
    await WaitUtils.waitForHidden(this.findLocator(this.loader));
    await WaitUtils.waitForVisible(this.findLocator(this.tableBody));
  }

  // Task-2 [UPDATED] Uses searchUser(username) and checks row visibility, Role & Status
  async verifyUserInList(username: string, role: string, status: string) {
    await this.searchUser(username);

    const row = this.findLocator(`.oxd-table-body .oxd-table-card:has-text("${username}")`);
    await AssertUtils.visible(row);
    await AssertUtils.containsText(row, role);
    await AssertUtils.containsText(row, status);
  }

  // Task-2 [NEW] Searches a username and verifies "No Records Found" (0 rows)
  async verifyUserNotInList(username: string) {
    await this.searchUser(username);
    await AssertUtils.visible(this.findLocator(this.toastInfo));
    await AssertUtils.visible(this.findLocator(this.noRecordsLabel));
    await AssertUtils.count(this.findLocator(this.tableCards), 0);
  }

  // Task-2 [NEW] Clicks the Edit (pencil) icon for the given username
  async openEditForm(username: string) {
    const editBtn = `.oxd-table-body .oxd-table-card:has-text("${username}") button:has(.bi-pencil-fill)`;
    await WaitUtils.waitForVisible(this.findLocator(editBtn));
    await this.clickOnElement(editBtn);
    await WaitUtils.waitForHidden(this.findLocator(this.loader));
    await AssertUtils.visible(this.findLocator(this.saveBtn));
  }

  async sortByUsername(order: 'Ascending' | 'Descending') {
    await this.clickOnElement(this.sortBtn);
    await WaitUtils.waitForDropdownVisible(this.findLocator(this.sortDropdown));
    await this.clickOnElement(`${this.sortDropdown} span:has-text("${order}")`);
    await WaitUtils.waitForHidden(this.findLocator(this.loader));
    return this.getAllCellTexts(this.tableUserCells);
  }

  // Task-2 [NEW] Negative delete: opens confirmation modal and clicks "No, Cancel"
  async cancelDeleteUser(username: string) {
    await this.clickOnElement(`.oxd-table-body .oxd-table-card:has-text("${username}") button:has(.bi-trash)`);
    await WaitUtils.waitForVisible(this.findLocator(this.cancelDeleteBtn));
    await this.clickOnElement(this.cancelDeleteBtn);
  }

  // Task-2 [UPDATED] Confirms delete and waits for spinner to finish
  async deleteUser(username: string) {
    await this.clickOnElement(`.oxd-table-body .oxd-table-card:has-text("${username}") button:has(.bi-trash)`);
    await WaitUtils.waitForVisible(this.findLocator(this.confirmDeleteBtn));
    await this.clickOnElement(this.confirmDeleteBtn);
    await WaitUtils.waitForHidden(this.findLocator(this.confirmDeleteBtn));
    await AssertUtils.visible(this.findLocator(this.toastSuccess));
    await WaitUtils.waitForHidden(this.findLocator(this.loader));
  }
}