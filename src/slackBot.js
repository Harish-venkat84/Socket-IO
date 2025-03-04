import pkg from "@slack/bolt";
import { socketDetails, listOfSymbols } from "./socketIO.js";
import { getExchangeAndSymbol } from "./telegramBot.js";
import { telegramBotCommandStatus } from "./messages.js";
import { slackStagingBotToken, slackStagingAppToken } from "./index.js";

const { App } = pkg;

async function startSlack() {
  const app = new App({
    token: slackStagingBotToken,
    appToken: slackStagingAppToken,
    socketMode: true, // Enables real-time event listening
  });

  // Listen to messages in channels
  //   app.message(async ({ message, say }) => {
  //     const userText = message.text.toLowerCase();

  //     if (userText === "hello") {
  //       await say(`Hi <@${message.user}>! How can I assist you?`);
  //     } else if (userText.includes("bye")) {
  //       await say("Goodbye! Have a great day! 👋");
  //     } else {
  //       await say(`You said: "${message.text}"`);
  //     }
  //   });

  setTimeout(() => {
    let notPresentText = true;
    app.message(async ({ message, say }) => {
      const userText = message.text.toLowerCase();
      listOfSymbols.forEach(async (url) => {
        let { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);
        let { order_book_lastUpdated, candlestick_lastUpdated } = socketDetails.get(url);
        if (userText === symbol.toLowerCase()) {
          notPresentText = false;
          await say(
            `Symbol: ${symbol}\nExchange: ${exchange}\n📚 Order Book last updated: ${order_book_lastUpdated}\n📈 Candlestick last updated: ${candlestick_lastUpdated}`
          );
        }
      });

      if (
        notPresentText &&
        userText !== "status" &&
        !userText.includes("order book") &&
        !userText.includes("candlestick") &&
        !userText.includes("symbol status has been changed from Active") &&
        !userText.includes("New symbol has been added to the exchange") &&
        !userText.includes("Socket Disconnected!!")
      ) {
        await say(
          `🙇 *"${message.text.toUpperCase()}"*: Sorry, this symbol is currently not *active/present* on the exchange or please check the *symbol name!*`
        );
      } else if (userText === "status") {
        await say(telegramBotCommandStatus(socketDetails, listOfSymbols));
      }
      notPresentText = true;
    });

    // Start the bot
    (async () => {
      await app.start();
      console.log("⚡ Slack bot is running...");
    })();
  }, 5000);
}

export { startSlack };
