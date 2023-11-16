const faker = require("faker");
const got = require("got");
const LocateChrome = require("locate-chrome");
const puppeteer = require("puppeteer-extra");
const stealth = require("puppeteer-extra-plugin-stealth");
const AnonymizeUAPlugin = require("puppeteer-extra-plugin-anonymize-ua");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const path = require("path");

// Local Imports
const { log, genPw, sleep, writeToFile, genNum } = require("./utils");

puppeteer.use(stealth());
puppeteer.use(AnonymizeUAPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class GMAIL {
  constructor(sms, headless) {
    this.browser = null;
    this.sms = sms;
    this.sms.operator = "";
    this.headless = headless;
  }

  async run() {
    try {
      await this.createAccount();
    } catch (e) {
      log(`[GOOGLE GEN] ---> ${e.message}`, "error");
      if (this.phoneId) {
        await this.cancelPhone(this.phoneId);
      }
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  async nextTab(page) {
    let buttons = await page.$$("button");
    for (let b = 0; b < buttons.length; b++) {
      const buttonText = await (
        await buttons[b].getProperty("innerText")
      ).jsonValue();
      if (
        buttonText === "Skip" ||
        buttonText === "Next" ||
        buttonText === "Continue" ||
        buttonText === "Yes, I’m in" ||
        buttonText === "I agree"
      ) {
        await buttons[b].click();
        break;
      }
    }
  }

  async findAndClickSkip(page) {
    let buttons = await page.$$("button");
    for (let b = 0; b < buttons.length; b++) {
      const buttonText = await (
        await buttons[b].getProperty("innerText")
      ).jsonValue();
      if (buttonText === "Skip") {
        await buttons[b].click();
        break;
      }
    }
  }

  async createAccount() {
    log("[GOOGLE GEN] ---> Generating...", "info");
    let first = faker.name.firstName();
    let last = faker.name.lastName();
    let mail = `${first}${genNum()}${last}${genNum()}`;
    this.email = mail;
    this.password = genPw();
    let browserConfig = {
      headless: this.headless,
      ignoreHTTPSErrors: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--window-position=0,0",
        "--ignore-certifcate-errors",
        "--ignore-certifcate-errors-spki-list",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--enable-features=NetworkService",
      ],
      defaultViewport: { width: 1575, height: 1503, deviceScaleFactor: 1.25 },
      executablePath: await LocateChrome(),
    };
    this.browser = await puppeteer.launch(browserConfig);
    let page = (await this.browser.pages())[0];
    const headers = {
      "accept-language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    };
    await page.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1.25,
    });
    await page.setJavaScriptEnabled(true);
    await page.setExtraHTTPHeaders(headers);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
    );
    await page.goto("https://accounts.google.com/SignUp");
    await page.waitForSelector("#firstName");
    await page.type("#firstName", first.replace(/[^a-zA-Z0-9,]/g, ""));
    await page.type("#lastName", last.replace(/[^a-zA-Z0-9,]/g, ""));
    await page.click('span[jsname="V67aGc"]');
    await page.waitForTimeout(1000);
    await page.type("#day", "01");
    await page.type("#year", "1990");
    await page.select("#month", "1");
    await page.select("#gender", "1");
    await this.nextTab(page);
    await page.waitForTimeout(2500);
    let elements = await page.$$(".jGAaxb");
    for (let i = 0; i < elements.length; i++) {
      let innerText = await (
        await elements[i].getProperty("innerText")
      ).jsonValue();
      if (innerText === "Create your own Gmail address") {
        await elements[i].click();
        break;
      }
    }
    await page.waitForTimeout(2500);
    await page.type(
      'input[name="Username"]',
      this.email.replace(/[^a-zA-Z0-9,]/g, "")
    );
    await this.nextTab(page);
    await page.waitForTimeout(5000);
    await page.type('input[name="Passwd"]', this.password.toString());
    await page.type('input[name="PasswdAgain"]', this.password.toString());
    await this.nextTab(page);
    await page.waitForTimeout(5000);
    let checkErrorHtml = await page.content();
    if (
      checkErrorHtml.includes("Sorry, we could not create your Google Account.")
    ) {
      log("[GOOGLE GEN] ---> Temp. ban occured. Retrying (10s)...", "error");
      await this.browser.close();
      this.browser = null;
      await sleep(10000);
      this.run();
    } else {
      // SMS SHIT
      await this.getBestService();
      let fivesim = await this.getPhoneNumber();
      if (fivesim && fivesim.phone && fivesim.id) {
        let { phone, id } = fivesim;
        this.phoneId = id;
        await page.type("#phoneNumberId", `${phone}`);
        await this.nextTab(page);
        await sleep(10000);
        let phoneHtml = await page.content();
        let phoneClipped = phoneHtml.includes(
          "This phone number cannot be used for verification."
        );
        if (phoneClipped) {
          if (this.phoneId) {
            await this.cancelPhone(this.phoneId);
          }
          log(
            `[GOOGLE GEN] ---> [5SIM.net] ---> Phone number (${phone}) is clipped by Google, retrying...`,
            "warn"
          );
          await this.browser.close();
          this.browser = null;
          this.run();
        } else {
          log("[GOOGLE GEN] ---> Waiting for SMS code...", "info");
          await page.waitForSelector("#code");
          let code = null;
          do {
            let c = await this.checkSms(id);
            if (c && c.sms && c.sms.length > 0) {
              code = c.sms[0].code;
              await this.finishPhone(id);
            } else {
              await sleep(1000);
            }
          } while (code === null);
          log(`[GOOGLE GEN] ---> Verifying with code: ${code}`, "info");
          await page.type("#code", `${code}`);
          await this.nextTab(page);
          await page.waitForTimeout(5000);
          // Recovery email?
          await this.findAndClickSkip(page);
          await page.waitForTimeout(5000);
          // Add phone number?
          await this.nextTab(page);
          await page.waitForTimeout(5000);
          // Review your account info
          await this.nextTab(page);
          await page.waitForTimeout(5000);
          // Privacy and Terms
          await this.nextTab(page);
          await sleep(10000);
          await this.browser.close();
          log("[GOOGLE GEN] ---> Successfully generated account!", "success");
          log(
            `[GOOGLE GEN] ---> Email: ${this.email}@gmail.com\nPassword: ${this.password}`,
            "success"
          );
          await writeToFile(
            path.join(__dirname, "..", "exports.txt"),
            `${this.email}@gmail.com:${this.password}`
          );
        }
      }
    }
  }

  // 5SIM
  async getPhoneNumber() {
    try {
      const response = await got.get(
        `https://5sim.net/v1/user/buy/activation/${this.sms.region}/${this.sms.operator}/google`,
        {
          headers: {
            Authorization: `Bearer ${this.sms.apiKey}`,
            Accept: "application/json",
          },
          responseType: "json",
        }
      );
      return response.body;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.body);
      } else {
        throw new Error(error.message);
      }
    }
  }

  async checkSms(id) {
    try {
      const response = await got.get(`https://5sim.net/v1/user/check/${id}`, {
        headers: {
          Authorization: `Bearer ${this.sms.apiKey}`,
          Accept: "application/json",
        },
        responseType: "json",
      });
      return response.body;
    } catch (error) {
      log(
        `[GOOGLE GEN] ---> [5sim.net] ---> Failed checking SMS code: ${error.message}`,
        "error"
      );
    }
  }

  async finishPhone(id) {
    try {
      const response = await got.get(`https://5sim.net/v1/user/finish/${id}`, {
        headers: {
          Authorization: `Bearer ${this.sms.apiKey}`,
          Accept: "application/json",
        },
        responseType: "json",
      });
      return response.body;
    } catch (error) {
      log(
        `[GOOGLE GEN] ---> [5sim.net] ---> Failed finishing SMS code: ${error.message}`,
        "error"
      );
    }
  }

  async cancelPhone(id) {
    try {
      const response = await got.get(`https://5sim.net/v1/user/cancel/${id}`, {
        headers: {
          Authorization: `Bearer ${this.sms.apiKey}`,
          Accept: "application/json",
        },
        responseType: "json",
      });
      return response.body;
    } catch (error) {
      log(
        `[GOOGLE GEN] ---> [5sim.net] ---> Failed finishing SMS code: ${error.message}`,
        "error"
      );
    }
  }

  async getBestService() {
    let { body } = await got.get(
      `https://5sim.net/v1/guest/prices?country=${this.sms.region}&product=google`,
      { responseType: "json" }
    );

    let data = body[this.sms.region]["google"];

    let sorted = Object.fromEntries(
      Object.entries(data).sort(([, a], [, b]) => b.rate - a.rate)
    );
    const firstObject = Object.keys(sorted)[0];
    this.operator = firstObject;
    this.operatorDetails = sorted[this.operator];
    this.sms.operator = this.operator;
    return;
  }

  // UTILS
  async scrollToBottom(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async getButtons(page) {
    let b = await page.$$("button");
    return b;
  }
}

module.exports = GMAIL;
