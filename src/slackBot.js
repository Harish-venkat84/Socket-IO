import pkg from "@slack/bolt";
import { socketDetails, listOfSymbols } from "./socketIO.js";
import { getExchangeAndSymbol } from "./telegramBot.js";
import { telegramBotCommandStatus } from "./messages.js";
import {
  feeder,
  slackStagingBotToken,
  slackStagingAppToken,
  slackUnicoinDcxAppToken,
  slackUnicoinDcxBotToken,
  slackZebacusAppToken,
  slackZebacusBotToken,
  stagingUrl,
  uniCoinDcxUrl,
  zebacusUrl,
} from "./index.js";

const { App } = pkg;

async function startSlack() {
  const websiteUrl = `${feeder === "staging" ? stagingUrl : feeder === "unicoindcx" ? uniCoinDcxUrl : zebacusUrl}`;

  const { appToken, botToken } =
    feeder === "staging"
      ? { appToken: slackStagingAppToken, botToken: slackStagingBotToken }
      : feeder === "unicoindcx"
      ? { appToken: slackUnicoinDcxAppToken, botToken: slackUnicoinDcxBotToken }
      : { appToken: slackZebacusAppToken, botToken: slackZebacusBotToken };

  const app = new App({
    token: botToken,
    appToken: appToken,
    socketMode: true, // Enables real-time event listening
  });

  let messageStatus = false;

  app.message(async ({ message, say }) => {
    const userText = message.text.toLowerCase();
    listOfSymbols.forEach(async (url) => {
      let { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);
      let { order_book_lastUpdated, candlestick_lastUpdated, ticker_lastUpdated, last_price } = socketDetails.get(url);
      if (userText === symbol.toLowerCase()) {
        messageStatus = true;
        await say(
          `Symbol: ${symbol}
            \nExchange: ${exchange}
            \n📚 Order Book last updated: ${order_book_lastUpdated}
            \n📈 Candlestick last updated: ${candlestick_lastUpdated}
            \n➤ Ticker last updated: ${ticker_lastUpdated}
            \n📌 Last price: ${last_price}
            \n🔗 URL: ${websiteUrl + symbol}`
        );
        return;
      }
    });

    if (userText === "status") {
      await say(telegramBotCommandStatus(socketDetails, listOfSymbols));
    } else if (message.user === undefined) {
      return;
    } else if (!messageStatus) {
      await say(
        `🙇 *"${message.text.toUpperCase()}"*: Sorry, this symbol is currently not *active/present* on the exchange or please check the *symbol name!*`
      );
    }
    messageStatus = false;
  });

  // Start the bot
  (async () => {
    await app.start();
    console.log("⚡ Slack bot is running...");
  })();
}

export { startSlack };
