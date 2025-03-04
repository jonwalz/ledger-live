import { expect } from "detox";
import {
  getElementById,
  getTextOfElement,
  openDeeplink,
  scrollToId,
  tapByElement,
  tapById,
  waitForElementById,
} from "../../helpers";
import jestExpect from "expect";

const baseLink = "portfolio";
export default class PortfolioPage {
  zeroBalance = "$0.00";
  graphCardBalanceId = "graphCard-balance";
  assetBalanceId = "asset-balance";
  readOnlyItemsId = "PortfolioReadOnlyItems";
  transferScrollListId = "transfer-scroll-list";
  stakeMenuButtonId = "transfer-stake-button";
  accountsListView = "PortfolioAccountsList";
  receiveButton = "receive-button";
  managerTabBarId = "TabBarManager";
  seeAllTransactionButton = "portfolio-seeAll-transaction";
  transactionAmountId = "portfolio-operation-amount";
  emptyPortfolioListId = "PortfolioEmptyList";
  emptyPortfolioList = () => getElementById(this.emptyPortfolioListId);
  portfolioSettingsButtonId = "settings-icon";
  portfolioSettingsButton = () => getElementById(this.portfolioSettingsButtonId);
  transferButton = () => getElementById("transfer-button");
  swapTransferMenuButton = () => getElementById("swap-transfer-button");
  stakeTransferMenuButton = () => getElementById(this.stakeMenuButtonId);
  sendTransferMenuButton = () => getElementById("transfer-send-button");
  receiveTransfertMenuButton = () => getElementById("transfer-receive-button");
  sendMenuButton = () => getElementById("send-button");
  walletTabMarket = () => getElementById("wallet-tab-Market");
  earnButton = () => getElementById("tab-bar-earn");
  addAccountCta = "add-account-cta";
  lastTransactionAmount = () => getElementById(this.transactionAmountId, 0);

  async navigateToSettings() {
    await tapByElement(this.portfolioSettingsButton());
  }

  async openTransferMenu() {
    await tapByElement(this.transferButton());
  }

  async navigateToSwapFromTransferMenu() {
    return await tapByElement(this.swapTransferMenuButton());
  }

  async waitForPortfolioPageToLoad() {
    await waitForElementById(this.portfolioSettingsButtonId, 120000);
  }

  async expectPortfolioEmpty() {
    await expect(this.portfolioSettingsButton()).toBeVisible();
    await expect(this.emptyPortfolioList()).toBeVisible();
  }

  async navigateToSendFromTransferMenu() {
    await tapByElement(this.sendTransferMenuButton());
  }

  async navigateToStakeFromTransferMenu() {
    await scrollToId(this.stakeMenuButtonId, this.transferScrollListId);
    await tapByElement(this.stakeTransferMenuButton());
  }

  async navigateToReceiveFromTransferMenu() {
    await tapByElement(this.receiveTransfertMenuButton());
  }

  async receive() {
    await tapById(this.receiveButton);
  }

  async expectPortfolioReadOnly() {
    await expect(this.portfolioSettingsButton()).toBeVisible();
    await waitForElementById(this.readOnlyItemsId);
    jestExpect(await getTextOfElement(this.graphCardBalanceId)).toBe(this.zeroBalance);
    for (let index = 0; index < 4; index++)
      jestExpect(await getTextOfElement(this.assetBalanceId, index)).toBe(this.zeroBalance);
  }

  async openViaDeeplink() {
    await openDeeplink(baseLink);
  }

  async openWalletTabMarket() {
    await tapByElement(this.walletTabMarket());
  }

  async openMyLedger() {
    await tapById(this.managerTabBarId);
  }

  async openEarnApp() {
    await tapByElement(this.earnButton());
  }

  async addAccount() {
    await scrollToId(this.addAccountCta, this.emptyPortfolioListId);
    await tapById(this.addAccountCta);
  }

  async scrollToTransactions() {
    await scrollToId(this.seeAllTransactionButton, this.accountsListView);
  }

  async expectLastTransactionAmount(amount: string) {
    await expect(this.lastTransactionAmount()).toHaveText(amount);
  }

  async openLastTransaction() {
    await tapByElement(this.lastTransactionAmount());
  }
}
