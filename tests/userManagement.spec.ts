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
    const existingUser = await adminUserPage.getExistingUsername();
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

  test('TC03 [Positive] - Add user, verify in list & cleanup', async ({ adminUserPage }) => {
    const data = adminUserPage.getUserData();
    const existingEmployeeName = await adminUserPage.getExistingEmployeeFirstName();
    const role = AdminUserPage.pickRandom(data.roles);
    const status = AdminUserPage.pickRandom(data.statuses);
    const username = adminUserPage.randomStringGenerator('qa');
    const password = AdminUserPage.dynamicPassword();

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

    await adminUserPage.verifyUserInList(username, role, status);
    await adminUserPage.deleteUser(username);
  });

  test('TC04 [Positive] - Sort Username Ascending & Descending', async ({ adminUserPage }) => {
    for (const order of ['Ascending', 'Descending'] as const) {
      const usernames = await adminUserPage.sortByUsername(order);
      AssertUtils.verifySorted(usernames, order);
    }
  });
});
