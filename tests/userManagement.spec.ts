import { test } from '../fixtures/baseFixtures';
import { CreatedUser } from '../pages/AdminUserPage';
import { AssertUtils } from '../utils/AssertUtils';

test.describe('OrangeHRM Admin User Management', () => {
  test.beforeEach(async ({ loginPage, adminUserPage }) => {
    const data = loginPage.getUserData();
    await loginPage.open();
    await loginPage.login(data.credentials.username, data.credentials.password);
    await adminUserPage.navigate();
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

  test('TC07 [Positive] - Sort Username Ascending & Descending', async ({ adminUserPage }) => {
    for (const order of ['Ascending', 'Descending'] as const) {
      const usernames = await adminUserPage.sortByUsername(order);
      AssertUtils.verifySorted(usernames, order);
    }
  });

  // =========================================================================
  // NEGATIVE SCENARIOS FOR SEARCH, EDIT & DELETE (TC08)
  // =========================================================================

  test('TC08 [Negative] - Search, Edit & Delete negative scenarios on newly created user', async ({
    adminUserPage,
  }) => {
    const existingUser = await adminUserPage.getExistingUsername();
    const user = await adminUserPage.addUser();

    // 1. [Search - Negative] Search non-existent username -> "No Records Found"
    await adminUserPage.verifyUserNotInList(adminUserPage.randomStringGenerator('ghost'));
    await adminUserPage.resetSearch();

    // 2. [Edit - Negative] Duplicate username & password mismatch -> Cancel changes
    await adminUserPage.validateDuplicateEditAndMismatch(user, existingUser);
    await adminUserPage.verifyUserInList(user.username, user.role, user.status);

    // 3. [Delete - Negative] Click Delete -> "No, Cancel" -> User remains in list
    await adminUserPage.deleteUser(user.username, false);
    await adminUserPage.verifyUserInList(user.username, user.role, user.status);

    // Cleanup: Confirm delete
    await adminUserPage.deleteUser(user.username, true);
  });
});

