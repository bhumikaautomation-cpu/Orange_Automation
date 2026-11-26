import { BrowserContext } from '@playwright/test';
import { test } from '../fixtures/baseFixtures';
import { CreatedUser } from '../pages/AdminUserPage';
import { LoginPage } from '../pages/LoginPage';
import { AssertUtils, SortDirection } from '../utils/AssertUtils';

type SavedAuthState = Awaited<ReturnType<BrowserContext['storageState']>>;

test.describe('OrangeHRM Admin User Management', () => {
  test.describe.configure({ mode: 'serial' });

  let authState: SavedAuthState;

  // 1. Logs in ONCE before all tests and saves the session in memory
  test.beforeAll(async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      storageState: undefined, // Ensures a clean logged-out context for initial login
    });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    const data = loginPage.getUserData();
    await page.goto('/web/index.php/auth/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await loginPage.login(data.credentials.username, data.credentials.password);

    authState = await context.storageState();
    await context.close();
  });

  // 2. Reuses the saved session for every test automatically
  test.use({
    storageState: async ({}, use) => {
      await use(authState);
    },
  });

  // 3. Navigates straight to the Admin Users table without calling loginPage.open()
  test.beforeEach(async ({ adminUserPage }) => {
    await adminUserPage.openDirect();
  });

  // =========================================================================
  // NEGATIVE FIELD VALIDATIONS (TC01 - TC02)
  // =========================================================================

  test('TC01 [Negative] - Mandatory fields validation', async ({ adminUserPage }) => {
    await adminUserPage.validateMandatoryFields();
  });

  test('TC02 [Negative] - Invalid inputs, password rules & duplicate username', async ({ adminUserPage }) => {
    const existingUser = (await adminUserPage.getExistingUsername())?.trim() || 'Admin';
    await adminUserPage.validateInvalidInputs(existingUser);
  });

  // =========================================================================
  // SEPARATE POSITIVE CRUD TEST CASES (TC03 - TC06)
  // =========================================================================

  test.describe.serial('Positive User CRUD Operations', () => {
    let createdUser: CreatedUser;

    test('TC03 [Positive] - Add User', async ({ adminUserPage }) => {
      createdUser = await adminUserPage.addUser();
      await adminUserPage.verifyUserInList(createdUser.username, createdUser.role, createdUser.status);
    });

    test('TC04 [Positive] - Search User', async ({ adminUserPage }) => {
      await adminUserPage.searchUser(createdUser.username);
      await adminUserPage.verifyUserInList(createdUser.username, createdUser.role, createdUser.status);
    });

    test('TC05 [Positive] - Edit User', async ({ adminUserPage }) => {
      createdUser = await adminUserPage.editUser(createdUser);
      await adminUserPage.verifyUserInList(createdUser.username, createdUser.role, createdUser.status);
    });

    test('TC06 [Positive] - Delete User', async ({ adminUserPage }) => {
      await adminUserPage.deleteUser(createdUser.username, true);
      await adminUserPage.verifyUserNotInList(createdUser.username);
    });
  });

  // =========================================================================
  // SORT USERNAME ASCENDING & DESCENDING (TC07)
  // =========================================================================

  test('TC07 [Positive] - Sort Username Ascending & Descending', async ({ adminUserPage, page }) => {
    test.setTimeout(120_000);

    const suffix = adminUserPage.randomStringGenerator('').slice(-4);
    const mixedUsernames = [
      `_123alpha_${suffix}`, // Special char (_) + numbers + alphabet
      `99_beta_${suffix}`,   // Numbers + special char (_) + alphabet
    ];
    const seededUsers: CreatedUser[] = [];
    const directions: SortDirection[] = ['Ascending', 'Descending'];

    try {
      // Seed temporary users with special char + numeric + alphabet combinations
      for (const username of mixedUsernames) {
        const user = await adminUserPage.addUser({ username });
        seededUsers.push(user);
      }

      // Validate Ascending & Descending (sortByUsername flips pre-sorted lists automatically)
      for (const order of directions) {
        const usernames = await adminUserPage.sortByUsername(order);
        AssertUtils.verifySorted(usernames, order);
      }
    } finally {
      // Clean up temporary users even if an assertion fails
      if (!page.isClosed()) {
        for (const user of seededUsers) {
          await adminUserPage.deleteUser(user.username, true);
        }
      }
    }
  });

  // =========================================================================
  // NEGATIVE SCENARIOS FOR SEARCH, EDIT & DELETE (TC08)
  // =========================================================================

  test('TC08 [Negative] - Search, Edit & Delete negative scenarios on newly created user', async ({
    adminUserPage,
    page,
  }) => {
    test.setTimeout(120_000);

    const existingUser = 'Admin';
    const user = await adminUserPage.addUser();

    try {
      // 1. [Search - Negative] Search non-existent username -> "No Records Found"
      await adminUserPage.verifyUserNotInList(adminUserPage.randomStringGenerator('ghost'));

      // 2. [Edit - Negative] Duplicate username & password mismatch -> Cancel changes
      await adminUserPage.validateDuplicateEditAndMismatch(user, existingUser);
      await adminUserPage.verifyUserInList(user.username, user.role, user.status);

      // 3. [Delete - Negative] Click Delete -> "No, Cancel" -> User remains in list
      await adminUserPage.deleteUser(user.username, false);
      await adminUserPage.verifyUserInList(user.username, user.role, user.status);
    } finally {
      // Cleanup: Confirm delete if browser tab is still open
      if (!page.isClosed()) {
        await adminUserPage.deleteUser(user.username, true);
      }
    }
  });
});
