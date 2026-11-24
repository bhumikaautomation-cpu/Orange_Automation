import { test } from '../fixtures/baseFixtures';
import { AdminUserPage } from '../pages/AdminUserPage';
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
    await adminUserPage.submit();
    await AssertUtils.count(adminUserPage.findLocator(adminUserPage.errorLabels), data.mandatoryFieldLabels.length);

    for (const label of data.mandatoryFieldLabels) {
      const expectedMsg =
        label === 'Confirm Password'
          ? data.validationMessages.confirmPasswordRequired
          : data.validationMessages.required;

      await AssertUtils.exactText(adminUserPage.fieldError(label), expectedMsg);
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
          username: AdminUserPage.shortString(3),
          password: AdminUserPage.shortString(5),
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
        payload: { password: AdminUserPage.passwordNoLowercase(8) },
        checks: [{ label: 'Password', msg: data.validationMessages.missingLowercasePassword }],
      },
      {
        payload: { password: AdminUserPage.passwordNoNumber(8) },
        checks: [{ label: 'Password', msg: data.validationMessages.missingNumberPassword }],
      },
      {
        payload: { username: existingUser },
        checks: [{ label: 'Username', msg: data.validationMessages.duplicateUsername }],
      },
    ];

    for (const s of scenarios) {
      await adminUserPage.fillForm(s.payload);
      await adminUserPage.submit();
      for (const c of s.checks) {
        await AssertUtils.exactText(adminUserPage.fieldError(c.label), c.msg);
      }
    }
  });

 
  // =========================================================================
  // [UPDATED] TC03: 6-STEP DYNAMIC USER FLOW ('btest')
  // 1. Add user1 -> 2. Search user1 -> 3. Delete user1
  // 4. Add user2 -> 5. Edit user2   -> 6. Delete user2
  // =========================================================================

  test('TC03 [Positive] - 6-Step Flow: Add/Search/Delete -> Add/Edit/Delete', async ({ adminUserPage }) => {
    const data = adminUserPage.getUserData();
    const existingEmployeeName = await adminUserPage.getExistingEmployeeFirstName();

    const role = data.roles[1]; // "ESS"
    const status = data.statuses[0]; // "Enabled"
    const updatedRole = data.roles[0]; // "Admin"
    const updatedStatus = data.statuses[1]; // "Disabled"

    // -----------------------------------------------------------------------
    // STEP 1: Add new user (user1)
    // -----------------------------------------------------------------------
    const user1 = adminUserPage.randomStringGenerator('btest');
    const pass1 = AdminUserPage.dynamicPassword();

    await adminUserPage.openAddForm();
    await adminUserPage.fillForm({
      userRole: role,
      employeeSearchText: existingEmployeeName,
      status,
      username: user1,
      password: pass1,
      confirmPassword: pass1,
    });
    await adminUserPage.submit();
    await AssertUtils.visible(adminUserPage.findLocator(adminUserPage.toastSuccess));

    // -----------------------------------------------------------------------
    // STEP 2: Search this user (user1)
    // -----------------------------------------------------------------------
    await adminUserPage.verifyUserInList(user1, role, status);

    // -----------------------------------------------------------------------
    // STEP 3: Delete this user (user1)
    // -----------------------------------------------------------------------
    await adminUserPage.deleteUser(user1);

    // -----------------------------------------------------------------------
    // STEP 4: Add new user (user2)
    // -----------------------------------------------------------------------
    const user2 = adminUserPage.randomStringGenerator('btest');
    const pass2 = AdminUserPage.dynamicPassword();

    await adminUserPage.openAddForm();
    await adminUserPage.fillForm({
      userRole: role,
      employeeSearchText: existingEmployeeName,
      status,
      username: user2,
      password: pass2,
      confirmPassword: pass2,
    });
    await adminUserPage.submit();
    await AssertUtils.visible(adminUserPage.findLocator(adminUserPage.toastSuccess));

    // -----------------------------------------------------------------------
    // STEP 5: Edit this user (user2 -> user2Edited)
    // -----------------------------------------------------------------------
    const user2Edited = adminUserPage.randomStringGenerator('btest');
    const updatedPass2 = AdminUserPage.dynamicPassword();

    await adminUserPage.searchUser(user2);
    await adminUserPage.openEditForm(user2);
    await adminUserPage.fillForm({
      userRole: updatedRole,
      status: updatedStatus,
      username: user2Edited,
      enableChangePassword: true,
      password: updatedPass2,
      confirmPassword: updatedPass2,
    });
    await adminUserPage.submit();
    await AssertUtils.visible(adminUserPage.findLocator(adminUserPage.toastSuccess));
    await adminUserPage.verifyUserInList(user2Edited, updatedRole, updatedStatus);

    // -----------------------------------------------------------------------
    // STEP 6: Delete this user (user2Edited)
    // -----------------------------------------------------------------------
    await adminUserPage.deleteUser(user2Edited);
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
  // [NEW] TC05: NEGATIVE SCENARIOS FOR SEARCH, EDIT & DELETE
  // Creates a fresh 'btest' user first, then tests all negative cases
  // =========================================================================

  test('TC05 [Negative] - Search, Edit & Delete negative scenarios on newly created user', async ({
    adminUserPage,
  }) => {
    const data = adminUserPage.getUserData();
    const existingUser = await adminUserPage.getExistingUsername();
    const existingEmployeeName = await adminUserPage.getExistingEmployeeFirstName();
    const role = AdminUserPage.pickRandom(data.roles);
    const status = AdminUserPage.pickRandom(data.statuses);
    const username = adminUserPage.randomStringGenerator('btest');
    const password = AdminUserPage.dynamicPassword();

    // Prerequisite: Create fresh dynamic user first
    await adminUserPage.openAddForm();
    await adminUserPage.fillForm({
      userRole: role,
      employeeSearchText: existingEmployeeName,
      status,
      username,
      password,
      confirmPassword: password,
    });
    await adminUserPage.submit();
    await AssertUtils.visible(adminUserPage.findLocator(adminUserPage.toastSuccess));

    // 1. [Search - Negative] Search non-existent username -> "No Records Found"
    await adminUserPage.verifyUserNotInList(adminUserPage.randomStringGenerator('ghost'));
    await adminUserPage.resetSearch();

    // 2. [Edit - Negative] Validate blank, short & duplicate username errors + Cancel button
    await adminUserPage.searchUser(username);
    await adminUserPage.openEditForm(username);

    const editScenarios = [
      {
        payload: { username: '' },
        checks: [{ label: 'Username', msg: data.validationMessages.required }],
      },
      {
        payload: { username: AdminUserPage.shortString(3) },
        checks: [{ label: 'Username', msg: data.validationMessages.minUsername }],
      },
      {
        payload: { username: existingUser },
        checks: [{ label: 'Username', msg: data.validationMessages.duplicateUsername }],
      },
    ];

    for (const s of editScenarios) {
      await adminUserPage.fillForm(s.payload);
      await adminUserPage.submit();
      for (const c of s.checks) {
        await AssertUtils.exactText(adminUserPage.fieldError(c.label), c.msg);
      }
    }

    // Cancel Edit -> original user stays unchanged
    await adminUserPage.cancelForm();
    await adminUserPage.verifyUserInList(username, role, status);

    // 3. [Delete - Negative] Click Delete -> Click "No, Cancel" -> user stays in list
    await adminUserPage.cancelDeleteUser(username);
    await adminUserPage.verifyUserInList(username, role, status);

    // Cleanup: Delete test user and confirm removal
    await adminUserPage.deleteUser(username);
    await adminUserPage.verifyUserNotInList(username);
  });
});