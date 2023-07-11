const puppeteer = require("puppeteer");
const xlsx = require("xlsx");
const delay = require("./helper/delay");
const { clickElementWithText } = require("./helper/click");

const options = {
  headless: false,
  args: [
    "--disable-extensions-except=./crx/MetaMask",
    "--load-extension=./crx/MetaMask",
  ],
};

const createWallet = async () => {
  const browser = await puppeteer.launch(options);

  await delay(5000);

  const pages = await browser.pages();
  const page = pages[1];

  await page.waitForSelector(".onboarding__terms-checkbox");

  let metamaskUrl = await page.evaluate(() => document.location.href);
  metamaskUrl = metamaskUrl.substring(0, metamaskUrl.indexOf("#"));

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(metamaskUrl, ["clipboard-read"]);

  await page.click(".onboarding__terms-checkbox");

  await clickElementWithText(page, ".btn-primary", "Create a new wallet");

  await page.waitForSelector(".btn-primary");

  await clickElementWithText(page, ".btn-primary", "I agree");

  await page.waitForSelector(".form-field__input");

  await page.click(".form-field__input");

  await page.keyboard.type("123456789");
  await page.keyboard.press("Tab");
  await page.keyboard.type("123456789");

  await page.click("input.check-box");

  await clickElementWithText(page, ".btn-primary", "Create a new wallet");

  await delay(1500);

  await clickElementWithText(
    page,
    ".btn-primary",
    "Secure my wallet (recommended)"
  );

  await page.waitForSelector(".fa-eye");

  await clickElementWithText(
    page,
    ".btn-primary",
    "Reveal Secret Recovery Phrase"
  );

  await page.waitForSelector("div.chip--max-content");

  const secretPhrase = await page.evaluate(() => {
    const secretPhraseWords = [];

    const wordNodes = [...document.querySelectorAll("div.chip--max-content")];
    for (const wordNode of wordNodes) {
      secretPhraseWords.push(wordNode.textContent);
    }

    return secretPhraseWords;
  });

  await clickElementWithText(page, ".btn-primary", "Next");

  await page.waitForSelector("div.chip--max-content");

  const missingWordNumbers = await page.evaluate(() => {
    const missingWordNumbers = [];
    const wordNodes = [...document.querySelectorAll("div.chip--max-content")];
    for (let i = 0; i < wordNodes.length; i++) {
      if (wordNodes[i].textContent === "") {
        missingWordNumbers.push(i);
      }
    }

    return missingWordNumbers;
  }, secretPhrase);

  for (const missingWordNumber of missingWordNumbers) {
    await page.keyboard.press("Tab");
    await page.keyboard.type(secretPhrase[missingWordNumber]);
  }
  await page.waitForSelector(".btn-primary:not([disabled])");
  await clickElementWithText(page, ".btn-primary", "Confirm");
  await page.waitForSelector(".btn-primary");
  await clickElementWithText(page, ".btn-primary", "Got it!");
  await page.waitForSelector(".btn-primary");
  await clickElementWithText(page, ".btn-primary", "Next");
  await page.waitForSelector(".btn-primary");
  await clickElementWithText(page, ".btn-primary", "Done");
  await page.waitForSelector(".btn-primary");

  await clickElementWithText(page, ".btn-primary", "Enable security alerts");

  await page.waitForSelector(".settings-page__content-row");

  await page.evaluate(() => {
    const options = [
      ...document.querySelectorAll(".settings-page__content-row"),
    ];

    const openSeaApi = options[1];
    const openSeaApiOn = openSeaApi.querySelectorAll(
      ".settings-page__content-item"
    )[1];
    openSeaApiOn.querySelector(".toggle-button").click();

    const autodetectNFT = options[2];
    const autodetectNFTOn = autodetectNFT.querySelectorAll(
      ".settings-page__content-item"
    )[1];
    autodetectNFTOn.querySelector(".toggle-button").click();
  });

  await page.click(".app-header__metafox-logo--horizontal");

  await page.waitForSelector(".btn-primary");

  await clickElementWithText(page, ".btn-primary", "Enable NFT autodetection");

  await page.waitForSelector(".app-header__metafox-logo--horizontal");

  await page.click(".app-header__metafox-logo--horizontal");

  await page.goto(`${metamaskUrl}#settings/advanced`);

  await page.waitForSelector(".settings-page__content-row");

  await page.evaluate(() => {
    const options = [
      ...document.querySelectorAll(".settings-page__content-row"),
    ];

    const testnetsVisible = options[4];
    const testnetsVisibleOn = testnetsVisible.querySelectorAll(
      ".settings-page__content-item"
    )[1];
    testnetsVisibleOn.querySelector(".toggle-button").click();
  });

  await page.click(".app-header__metafox-logo--horizontal");

  await page.waitForSelector(".selected-account__address");

  const address = await page.evaluate(() => {
    document.querySelector(".selected-account__address").click();

    return navigator.clipboard.readText();
  });

  await browser.close();

  return { address, secretPhrase };
};

const main = async () => {
  let failedWallets = 0;

  for (let i = 0; i < 28; i++) {
    console.log("🔸 Current address: ", i + 1);
    try {
      const { address, secretPhrase } = await createWallet();

      const workbook = xlsx.readFile("wallets.xlsx");
      let worksheets = {};

      for (const sheetName of workbook.SheetNames) {
        worksheets[sheetName] = xlsx.utils.sheet_to_json(
          workbook.Sheets[sheetName]
        );
      }

      worksheets.Sheet1.push({
        "Wallet address": address,
        "Wallet mnemonic": secretPhrase.join(" "),
      });

      xlsx.utils.sheet_add_json(workbook.Sheets["Sheet1"], worksheets.Sheet1);
      xlsx.writeFile(workbook, "wallets.xlsx");
    } catch {
      failedWallets += 1;
    }
  }

  console.log(`TOTAL FAILED WALLETS: ${failedWallets}`);
};

main();
