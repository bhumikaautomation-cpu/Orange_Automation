import { test } from '../fixtures/baseFixtures';
import { AdminUserPage } from '../pages/AdminUserPage';
import { PlaywrightActions } from '../utils/Actions';
import { AssertUtils } from '../utils/AssertUtils';

test.describe('OrangeHRM Admin User Management', () => {
  test.beforeEach(async ({ loginPage, adminUserPage }) => {
    const data = loginPage.getUserData();
    await loginPage.open();
    await loginPage.login(data.credentials.username, data.credentials.password);
    await adminUserPage.navigate();
  });

  // =========================================================================
  // TASK 1: MANDATORY & INVALID FIELD VALIDATIONS (TC01 - TC02)
  // =========================================================================

  test('TC01 [Negative] - Mandatory fields validation', async ({ adminUserPage }) => {
    const data = adminUserPage.getUserData();
    await adminUserPage.openAddForm();
    await adminUserPage.saveForm();

    await adminUserPage.verifyErrorCount(data.mandatoryFieldLabels.length);

    for (const label of data.mandatoryFieldLabels) {
      const expectedMsg =
        label === 'Confirm Password'
          ? data.validationMessages.confirmPasswordRequired
          : data.validationMessages.required;

      await adminUserPage.verifyFieldError(label, expectedMsg);
    }
  });

  test('TC02 [Negative] - Invalid inputs, password rules & duplicate username', async ({ adminUserPage }) => {
    const data = adminUserPage.getUserData();
    const existingUser = (await adminUserPage.getExistingUsername())?.trim() || 'Admin';

    await adminUserPage.openAddForm();

    const scenarios = [
      {
        payload: {
          rawEmployee: adminUserPage.randomStringGenerator('invalid'),
          username: PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz0123456789', 3),
          password: PlaywrightActions.generateRandom('abcdefghijklmnopqrstuvwxyz0123456789', 5),
          confirmPassword: AdminUserPage.dynamicPassword(),
        },
        checks: [
          { label: 'Employee Name', msg: data.validationMessages.invalidEmployee },
          { label: 'Username', msg: data.validationMessages.minUsername },
          { label: 'Password', msg: data.validationMessages.minPassword },
          { label: 'Confirm Password', msg: data.validationMessages.passwordMismatch },
        ],
      },
      {
        payload: { password: PlaywrightActions.generateRandom('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8) },
        checks: [{ label: 'Password', msg: data.validationMessages.missingLowercasePassword }],
      },
      {
        payload: { password: PlaywrightActions.generateRandom('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8) },
        checks: [{ label: 'Password', msg: data.validationMessages.missingNumberPassword }],
      },
      {
        payload: { username: existingUser },
        checks: [{ label: 'Username', msg: data.validationMessages.duplicateUsername }],
      },
    ];

    for (const s of scenarios) {
      await adminUserPage.fillForm(s.payload);
      await adminUserPage.saveForm();
      for (const c of s.checks) {
        await adminUserPage.verifyFieldError(c.label, c.msg);
      }
    }
  });

  // =========================================================================
  // TC03: 6-STEP DYNAMIC USER FLOW ('btest')
  // 1. Add user1 -> 2. Search user1 -> 3. Delete user1
  // 4. Add user2 -> 5. Edit user2   -> 6. Delete user2
  // =========================================================================

  test('TC03 [Positive] - 6-Step Flow: Add/Search/Delete -> Add/Edit/Delete', async ({ adminUserPage }) => {
    // 1. Add user1 -> 2. Search user1 -> 3. Delete user1
    const user1 = await adminUserPage.addUser();
    await adminUserPage.verifyUserInList(user1.username, user1.role, user1.status);
    await adminUserPage.deleteUser(user1.username);
    await adminUserPage.verifyUserNotInList(user1.username);

    // 4. Add user2 -> 5. Edit user2 -> 6. Delete user2
    const user2 = await adminUserPage.addUser();
    const updatedUser2 = await adminUserPage.editUser(user2);
    await adminUserPage.verifyUserInList(updatedUser2.username, updatedUser2.role, updatedUser2.status);
    await adminUserPage.deleteUser(updatedUser2.username);
    await adminUserPage.verifyUserNotInList(updatedUser2.username);
  });

  // =========================================================================
  // TASK 1: SORT USERNAME ASCENDING & DESCENDING (TC04)
  // =========================================================================

  test('TC04 [Positive] - Sort Username Ascending & Descending', async ({ adminUserPage }) => {
    for (const order of ['Ascending', 'Descending'] as const) {
      const usernames = await adminUserPage.sortByUsername(order);
      AssertUtils.verifySorted(usernames, order);
    }
  });

  // =========================================================================
  // TC05: NEGATIVE SCENARIOS FOR SEARCH, EDIT & DELETE
  // =========================================================================

  test('TC05 [Negative] - Search, Edit & Delete negative scenarios on newly created user', async ({
    adminUserPage,
  }) => {
    const data = adminUserPage.getUserData();
    const existingUser = await adminUserPage.getExistingUsername();

    // Setup: Create fresh user in one line
    const user = await adminUserPage.addUser();

    // 1. [Search - Negative] Search non-existent username -> "No Records Found"
    await adminUserPage.verifyUserNotInList(adminUserPage.randomStringGenerator('ghost'));
    await adminUserPage.resetSearch();

    // 2. [Edit - Negative] Duplicate username & password mismatch -> Cancel changes
    await adminUserPage.openEditForm(user.username);
    await adminUserPage.fillForm({
      username: existingUser,
      enableChangePassword: true,
      password: user.password,
      confirmPassword: AdminUserPage.dynamicPassword(),
    });
    await adminUserPage.saveForm();
    await adminUserPage.verifyFieldError('Username', data.validationMessages.duplicateUsername);
    await adminUserPage.verifyFieldError('Confirm Password', data.validationMessages.passwordMismatch);
    await adminUserPage.cancelForm();
    await adminUserPage.verifyUserInList(user.username, user.role, user.status);

    // 3. [Delete - Negative] Click Delete -> "No, Cancel" -> User remains in list
    await adminUserPage.deleteUser(user.username, false);
    await adminUserPage.verifyUserInList(user.username, user.role, user.status);

    // Cleanup: Confirm delete
    await adminUserPage.deleteUser(user.username, true);
  });
});