import pkg from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { socketDetails, listOfSymbols } from "./socketIO.js";
import { getExchangeAndSymbol } from "./telegramBot.js";
import { telegramBotCommandStatus } from "./messages.js";
import { startTelegarmBot, disconnectBot } from "./telegramBotCommands.js";
import getSymbols from "./getSymbols.js";
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
let messageStatus = false;
const disconnectSymbol = new Set();
const manuallyDisconnected = new Map();
const prioritySymbols = new Set();
const websiteUrl = `${feeder === "staging" ? stagingUrl : feeder === "unicoindcx" ? uniCoinDcxUrl : zebacusUrl}`;
let addedDisconnectSymbol = false;
let addedPrioritySymbols = false;

async function startSlack() {
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

  const web = new WebClient(botToken);

  app.message(async ({ message, say }) => {
    if (!message?.text) return;
    const userInfo = await web.users.info({ user: message.user });
    let userText;
    if (message.text.includes("*")) {
      userText = message.text.substr(1, message.text.length - 2).toLowerCase();
    } else {
      userText = message.text.toLowerCase();
    }

    symbolsStatus(userText, say);

    customMessages(userText, message, say, userInfo);

    messageStatus = false;
    addedDisconnectSymbol = false;
    addedPrioritySymbols = false;
  });

  // Start the bot
  (async () => {
    await app.start();
    console.log("⚡ Slack bot is running...");
  })();
}

async function symbolsStatus(userText, say) {
  for (const url of listOfSymbols) {
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
      break;
    }
  }
}

async function customMessages(userText, message, say) {
  if (userText === "status") {
    await say(telegramBotCommandStatus(socketDetails, listOfSymbols));
  } else if (message.user === undefined || userText.includes("joined")) {
    return;
  } else if (userText === "start telegram bot") {
    startTelegarmBot();
    await say("Telegram bot running....");
  } else if (userText === "disconnect telegram bot") {
    disconnectBot();
    await say("Telegram bot disconnected");
  } else if (userText.includes("-")) {
    addSymbolsToDisconnect(userText, say, userInfo);
  } else if (userText.includes("+")) {
    deleteSmbolsDisconnectMap(userText, say);
  } else if (userText === "disconnected symbols") {
    listOfDisconnectedSymbols(say);
  } else if (userText === "help") {
    helpCommand(say);
  } else if (userText.split(" ")[0].toLowerCase() === "add") {
    addPrioritySymbols(userText, say);
  } else if (userText.split(" ")[0].toLowerCase() === "delete") {
    deletePrioritySymbols(userText, say);
  } else if (userText === "priority symbols") {
    listOfPrioritySymbols(say);
  } else if (disconnectSymbol.has(userText)) {
    await say(
      `*${userText.toUpperCase()}*, This symbol socket disconnected by slack user\nTo reconnect use this command "+${userText.toUpperCase()}" or use the *"help"* command to see the list of commands`
    );
  } else if (!messageStatus) {
    await say(messageSymbolNotPresent(message.text));
  }
}

async function helpCommand(say) {
  await say(`List of commands:\n
    *status* - Total active socket\n
    *symbols name* eg(BTCUSDT) - To last updated timestamp for (orderbook, candlestick, ticket)\n
    *-symbol name* eg(-ETHUSDT) - To manually disconnect the socket for this symbol\n
    *+symbol name* eg(+ETHUSDT) - To re-connect the manually disconnect socket\n
    *disconnected symbols* - list of symbols manually disconnected by slack user\n
    *add symbol name* eg(add ETHUSDT) - To add to priority symbols for candlestick 60 seconds\n
    *delete symbol name* eg(delete ETHUSDT) - To delete the symbols from priority\n
    *priority symbols* - list of symbols added to priority for candlestick 60 seconds`);
}

async function listOfDisconnectedSymbols(say) {
  let message;

  if (disconnectSymbol.size > 0) {
    disconnectSymbol.forEach((value) => {
      message = message === undefined ? `*${value.toUpperCase()}*\n` : message + `*${value.toUpperCase()}*\n`;
    });
    await say(`List of symbols disconnected by slack users:\n${message}`);
  } else {
    await say("*Zero* symbol disconnected by slack users");
  }
}

async function addSymbolsToDisconnect(userText, say, userInfo) {
  (await getSymbols()).forEach(async (value) => {
    let { symbol } = getExchangeAndSymbol(value);
    if (userText.split("-")[1].toLowerCase() === symbol.toLowerCase()) {
      addedDisconnectSymbol = true;
      disconnectSymbol.add(`${userText.split("-")[1].toLowerCase()} - disconnect by ${userInfo?.user?.real_name}`);
      await say(`*${userText.split("-")[1].toUpperCase()}* disconnected manually...`);
      manuallyDisconnected.set(symbol.toLowerCase(), { disconnected: true });
    }
  });
  if (!addedDisconnectSymbol) {
    await say(messageSymbolNotPresent(userText.split("-")[1]));
  }
}

async function deleteSmbolsDisconnectMap(userText, say) {
  if (disconnectSymbol.has(userText.split("+")[1].toLowerCase())) {
    disconnectSymbol.delete(userText.split("+")[1].toLowerCase());
    await say(`*${userText.split("+")[1].toUpperCase()}* connected manually...`);
    manuallyDisconnected.set(symbol.toLowerCase(), { disconnected: true });
    if (prioritySymbols.has(userText.split("+")[1].toLowerCase())) {
      prioritySymbols.delete(userText.split("+")[1].toLowerCase());
    }
  } else {
    await say(
      `${userText.split("+")[1].toUpperCase()}, This symbol not add to *Disconnect*\nTo add use this command *"-${userText
        .split("+")[1]
        .toUpperCase()}"* or use the *"help"* command to see the list of commands`
    );
  }
}

async function addPrioritySymbols(userText, say) {
  (await getSymbols()).forEach(async (value) => {
    let { symbol } = getExchangeAndSymbol(value);
    if (symbol.toLowerCase() === userText.split(" ")[1]) {
      addedPrioritySymbols = true;
      prioritySymbols.add(userText.split(" ")[1]);
      await say(`*${userText.split(" ")[1].toUpperCase()}* Added`);
    }
  });

  if (!addedPrioritySymbols) {
    await say(messageSymbolNotPresent(userText.split(" ")[1]));
  }
}

async function deletePrioritySymbols(userText, say) {
  if (prioritySymbols.has(userText.split(" ")[1].toLowerCase())) {
    prioritySymbols.delete(userText.split(" ")[1].toLowerCase());
    await say(`*${userText.split(" ")[1].toUpperCase()}* deleted`);
  } else {
    await say(
      `${userText.split(" ")[1].toUpperCase()}, This symbol not add to *Priority*\nTo add use this command *"add ${userText
        .split(" ")[1]
        .toUpperCase()}"* or use the *"help"* command to see the list of commands`
    );
  }
}

async function listOfPrioritySymbols(say) {
  let message;
  if (prioritySymbols.size > 0) {
    prioritySymbols.forEach((value) => {
      message = message === undefined ? `*${value.toUpperCase()}*\n` : message + `*${value.toUpperCase()}*\n`;
    });
    await say(`List of priority symbols:\n${message}`);
  } else {
    await say("*Zero* priority symbols added");
  }
}

function messageSymbolNotPresent(userText) {
  return `🙇 *"${userText}"*: Sorry, this symbol is currently not *active/present* on the exchange or please check the *symbol name!*`;
}

export { startSlack, disconnectSymbol, manuallyDisconnected, prioritySymbols };
