const Promise = require("bluebird");
const axios = require("axios");
require('puppeteer');
require('dotenv').config();


const vaccine_reserve_site = process.env.VACCINE_RESERVE_SITE;
const search_hospitals = process.env.SEARCH_HOSPITALS;
const ticket_id = process.env.TICKET_ID
const password = process.env.PASSWORD

const get_availability = async () => {
  const browser = await require('puppeteer').launch({headless: true, slowMo: 1000});
  const page = await browser.newPage();
  await page.goto(vaccine_reserve_site);

  const inputs = await page.$$('.validate-input_input');
  await inputs[0].type(ticket_id);
  await inputs[1].type(password);
  await (await page.$('div.page-login_form-item:nth-child(3) > input')).click(); // 同意ボタン

  await (await page.$('.s-button.main')).click(); // ログインボタン

  await page.goto(search_hospitals);
  const available_list = page.$$('.available-true', options => options.map(option => option.textContent));
  const vaccine_available = await (await available_list).length !== 0
  // const unavailable_list = page.$$('.available-false', options => options.map(option => option.textContent));
  // console.log(await (await unavailable_list).length);
  await browser.close();

  return vaccine_available;
}

const post_to_slack = async () => {
  const slack_webhook = process.env.SLACK_WEBHOOK;
  const slack_payload = {
    text: "現在ワクチン接種枠に空きがあります！",
  };
  const response = await axios.post(slack_webhook, slack_payload);
  return response;
}

(async () => {
  const vaccine_available = await get_availability();
  if (vaccine_available === true)  {
    await post_to_slack();
    console.log('vaccine is available');
  } else {
    console.log('vaccine is unavailable');
  }
})();
