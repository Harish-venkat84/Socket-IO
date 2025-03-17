import TelegramBot from "node-telegram-bot-api";
import { getTelegramBotToken } from "./index.js";
import { telegramBotCommandStatus } from "./messages.js";
import { socketDetails, listOfSymbols } from "./socketIO.js";
import { getExchangeAndSymbol } from "./telegramBot.js";

async function setCommands(bot) {
  try {
    await bot.setMyCommands([
      { command: "start", description: "Start the bot" },
      { command: "help", description: "Show help message" },
      { command: "info", description: "Get bot information" },
      { command: "status", description: "Get socket status" },
    ]);
    console.log("✅ Commands set successfully!");
  } catch (error) {
    console.error("❌ Error setting commands:", error);
  }
}

// Initialize bot and set commands after a delay
let bot = new TelegramBot(getTelegramBotToken(), { polling: true });

async function startTelegarmBot() {
  setTimeout(() => {
    setCommands(bot);

    bot.onText(/\/start/, (msg) => bot.sendMessage(msg.chat.id, "Hello! I am your bot."));
    bot.onText(/\/help/, (msg) =>
      bot.sendMessage(msg.chat.id, "Available commands:\n/start - Start the bot\n/help - Show this message\n/info - Get bot info")
    );
    bot.onText(/\/info/, (msg) => bot.sendMessage(msg.chat.id, `Your ID: ${msg.chat.id}`));
    bot.onText(/\/status/, (msg) => bot.sendMessage(msg.chat.id, telegramBotCommandStatus(socketDetails, listOfSymbols)));

    bot.on("channel_post", (msg) => {
      if (!msg.text) return;
      const chatId = msg.chat.id;
      const text = msg.text.toLowerCase();
      if (text.startsWith("/start")) bot.sendMessage(chatId, "Hello Channel! The bot is active.");
      else if (text.startsWith("/info")) bot.sendMessage(chatId, `Channel ID: ${chatId}`);
      else if (text.startsWith("/status")) bot.sendMessage(chatId, telegramBotCommandStatus(socketDetails, listOfSymbols));
      else if (text.startsWith("/help"))
        bot.sendMessage(
          chatId,
          "Available commands:\n/start - Start the bot\n/help - Show this message\n/info - Get bot info\n/status - Get socket status"
        );
      else bot.sendMessage(chatId, "I don't understand that command.");
    });

    bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      const userText = msg.text;

      listOfSymbols.forEach((url) => {
        let { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);
        let { order_book_lastUpdated, candlestick_lastUpdated, ticker_lastUpdated } = socketDetails.get(url);
        if (userText.toLowerCase() === symbol.toLowerCase()) {
          bot.sendMessage(
            chatId,
            `Symbol: ${symbol}\nExchange: ${exchange}\n📚 Order Book last updated: ${order_book_lastUpdated}\n📈 Candlestick last updated: ${candlestick_lastUpdated}\n➤ Ticker last updated: ${ticker_lastUpdated}`
          );
        }
      });

      // if (userText.toLowerCase() === "hello") {
      //   bot.sendMessage(chatId, "Hi there! How can I help you?");
      // } else if (userText.toLowerCase().includes("bye")) {
      //   bot.sendMessage(chatId, "Goodbye! Have a great day!");
      // } else {
      //   bot.sendMessage(chatId, `You said: ${userText}`);
      // }
    });
  }, 5000); // Small delay to ensure bot is ready
}

function disconnectBot() {
  bot.removeAllListeners();
  bot.stopPolling();
  bot.off();
  bot.close();
}

export { startTelegarmBot, disconnectBot };
