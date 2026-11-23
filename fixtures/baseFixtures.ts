import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AdminUserPage } from '../pages/AdminUserPage';

export const test = base.extend<{
    loginPage: LoginPage;
    adminUserPage: AdminUserPage;
}>({
    loginPage: async ({ page }, use) => use(new LoginPage(page)),
    adminUserPage: async ({ page }, use) => use(new AdminUserPage(page)),
});

export { expect } from '@playwright/test';
