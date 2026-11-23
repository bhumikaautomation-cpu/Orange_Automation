import { Page } from '@playwright/test';
import { PlaywrightActions } from '../utils/Actions';
import { AssertUtils } from '../utils/AssertUtils';
import { WaitUtils } from '../utils/waitUtils';

export class LoginPage extends PlaywrightActions {
    usernameInput = 'input[name="username"]';
    passwordInput = 'input[name="password"]';
    submitBtn = 'button[type="submit"]';
    header = '.oxd-topbar-header-breadcrumb h6';

    constructor(page: Page) {
        super(page);
    }

    async open() {
        await this.openWebsite('');
        await AssertUtils.visible(this.findLocator(this.usernameInput));
    }

      async login(user: string, pass: string) {
    await this.enterText(this.usernameInput, user);
    await this.enterText(this.passwordInput, pass);
    await this.clickOnElement(this.submitBtn);
    await WaitUtils.waitForVisible(this.findLocator(this.header), 20000);
    await AssertUtils.exactText(this.findLocator(this.header), 'Dashboard');
  }

}
