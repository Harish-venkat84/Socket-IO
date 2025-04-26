import axios from "axios";
import pkg from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { socketDetails, listOfSymbols } from "./socketIO.js";
import { getExchangeAndSymbol } from "./telegramBot.js";
import { telegramBotCommandStatus } from "./messages.js";
import { startTelegarmBot, disconnectBot } from "./telegramBotCommands.js";
import getSymbols from "./getSymbols.js";
import crypto from "crypto";
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
  slackLocalAppToken,
  slackLocalBotToken,
} from "./index.js";

const { App } = pkg;
let messageStatus = false;
const disconnectSymbol = new Set();
let disconnectedUser = new Map();
const manuallyDisconnected = new Map();
const prioritySymbols = new Set();
const websiteUrl = `${feeder === "staging" ? stagingUrl : feeder === "unicoindcx" ? uniCoinDcxUrl : zebacusUrl}`;
let addedDisconnectSymbol = false;
let addedPrioritySymbols = false;
const pm2Symbol = new Set();
let addedPm2Symbols = false;
const pm2SymbolStatus = new Map();
let catch_count = 0;

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
    addedPm2Symbols = false;
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

async function customMessages(userText, message, say, userInfo) {
  switch (userText) {
    case "status": {
      await say(telegramBotCommandStatus(socketDetails, listOfSymbols));
      break;
    }
    case "start telegram bot": {
      startTelegarmBot();
      await say("Telegram bot running....");
      break;
    }
    case "disconnect telegram bot": {
      disconnectBot();
      await say("Telegram bot disconnected");
      break;
    }
    case "disconnected symbols": {
      listOfDisconnectedSymbols(say);
      break;
    }
    case "help": {
      helpCommand(say);
      break;
    }
    case "priority symbols": {
      listOfPrioritySymbols(say);
      break;
    }

    case "pm2 symbols": {
      listOf_pm2_symbols(say);
      break;
    }

    default: {
      if (userText.includes(" ")) {
        const userTextFirstIndex = userText.split(" ")[0].toLowerCase();
        switch (userTextFirstIndex) {
          case "add": {
            addPrioritySymbols(userText, say);
            break;
          }
          case "delete": {
            deletePrioritySymbols(userText, say);
            break;
          }
          case "pm2_add": {
            addSymbols_pm2(userText, say);
            break;
          }
          case "pm2_delete": {
            deleteSymbols_pm2(userText, say);
            break;
          }
          case "binance": {
            await validateBinanceSymbols(userText, say);
            break;
          }
          case "mexc": {
            await validateMexcSymbols(userText, say);
            break;
          }
          case "okx": {
            await validate_okx_symbols(userText, say);
            break;
          }
          case "kraken": {
            await validate_karken_symbols(userText, say);
            break;
          }
          case "kucoin": {
            await validate_kucoin_symbol(userText, say);
            break;
          }
        }
      } else {
        if (userText.includes("-")) {
          addSymbolsToDisconnect(userText, say, userInfo);
        } else if (userText.includes("+")) {
          deleteSmbolsDisconnectMap(userText, say);
        } else if (message.user === undefined || userText.includes("joined")) {
          return;
        } else if (!messageStatus) {
          await say(messageSymbolNotPresent(message.text));
        }
      }
    }
  }

  // if (userText === "status") {
  //   await say(telegramBotCommandStatus(socketDetails, listOfSymbols));
  // } else if (message.user === undefined || userText.includes("joined")) {
  //   return;
  // } else if (userText === "start telegram bot") {
  //   startTelegarmBot();
  //   await say("Telegram bot running....");
  // } else if (userText === "disconnect telegram bot") {
  //   disconnectBot();
  //   await say("Telegram bot disconnected");
  // } else if (userText.includes("-")) {
  //   addSymbolsToDisconnect(userText, say, userInfo);
  // } else if (userText.includes("+")) {
  //   deleteSmbolsDisconnectMap(userText, say);
  // } else if (userText === "disconnected symbols") {
  //   listOfDisconnectedSymbols(say);
  // } else if (userText === "help") {
  //   helpCommand(say);
  // } else if (userText.split(" ")[0].toLowerCase() === "add") {
  //   addPrioritySymbols(userText, say);
  // } else if (userText.split(" ")[0].toLowerCase() === "delete") {
  //   deletePrioritySymbols(userText, say);
  // } else if (userText === "priority symbols") {
  //   listOfPrioritySymbols(say);
  // } else if (disconnectSymbol.has(userText)) {
  //   await say(
  //     `*${userText.toUpperCase()}*, This symbol socket disconnected by slack user\nTo reconnect use this command "+${userText.toUpperCase()}" or use the *"help"* command to see the list of commands`
  //   );
  // } else if (userText.split(" ")[0].toLowerCase() === "pm2_add") {
  //   addSymbols_pm2(userText, say);
  // } else if (userText.split(" ")[0].toLowerCase() === "pm2_delete") {
  //   deleteSymbols_pm2(userText, say);
  // } else if (userText === "pm2 symbols") {
  //   listOf_pm2_symbols(say);
  // } else if (!messageStatus) {
  //   await say(messageSymbolNotPresent(message.text));
  // }
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
    *priority symbols* - list of symbols added to priority for candlestick 60 seconds\n
    *pm2_add symbol name* eg(pm2_add ETHUSDT) - To add to pm2 symbols\n
    *pm2_delete symbol name* eg(pm2_delete ETHUSDT) - To delete the symbols from pm2 list\n
    *pm2 symbols* - list of symbols added to pm2`);
}

async function listOfDisconnectedSymbols(say) {
  let message;

  if (disconnectedUser.size > 0) {
    disconnectedUser.forEach((value, key) => {
      message = message === undefined ? `*${key}* disconnected by ${value}\n` : message + `*${key}* disconnected by ${value}\n`;
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
      disconnectSymbol.add(userText.split("-")[1].toLowerCase());
      disconnectedUser.set(userText.split("-")[1].toUpperCase(), userInfo?.user?.real_name.toUpperCase());
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
    manuallyDisconnected.set(userText.split("+")[1].toLowerCase(), { disconnected: true });

    disconnectedUser.forEach((value, key) => {
      if (key === userText.split("+")[1].toUpperCase()) {
        disconnectedUser.delete(key);
      }
    });
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

async function addSymbols_pm2(userText, say) {
  (await getSymbols()).forEach(async (value) => {
    let { symbol } = getExchangeAndSymbol(value);
    if (symbol.toLowerCase() === userText.split(" ")[1]) {
      addedPm2Symbols = true;
      pm2Symbol.add(userText.split(" ")[1].toLowerCase());
      pm2SymbolStatus.set(userText.split(" ")[1].toLowerCase(), { status: false });
      await say(`*${userText.split(" ")[1].toUpperCase()}* Added to pm2 list`);
    }
  });

  if (!addedPm2Symbols) {
    await say(messageSymbolNotPresent(userText.split(" ")[1]));
  }
}

async function deleteSymbols_pm2(userText, say) {
  if (pm2Symbol.has(userText.split(" ")[1].toLowerCase())) {
    pm2Symbol.delete(userText.split(" ")[1].toLowerCase());
    pm2SymbolStatus.delete(userText.split(" ")[1].toLowerCase());
    await say(`*${userText.split(" ")[1].toUpperCase()}* deleted`);
  } else {
    await say(
      `${userText.split(" ")[1].toUpperCase()}, This symbol not add to *pm2 list*\nTo add use this command *"add-pm2 ${userText
        .split(" ")[1]
        .toUpperCase()}"* or use the *"help"* command to see the list of commands`
    );
  }
}

async function listOf_pm2_symbols(say) {
  let message;
  if (pm2Symbol.size > 0) {
    pm2Symbol.forEach((value) => {
      message = message === undefined ? `*${value.toUpperCase()}*\n` : message + `*${value.toUpperCase()}*\n`;
    });
    await say(`List of pm2 symbols:\n${message}`);
  } else {
    await say("*Zero* symbols added to pm2");
  }
}

async function validateBinanceSymbols(userText, say) {
  try {
    let binance_ulr = `https://api.binance.com/api/v3/exchangeInfo?symbol=${userText.split(" ")[1].toUpperCase()}`;
    const response = await axios(binance_ulr);
    if (response.data?.symbols[0]?.symbol === userText.split(" ")[1].toUpperCase()) {
      await say(`Binance symbol status: *${userText.split(" ")[1].toUpperCase()} - ${response.data?.symbols[0]?.status}*`);
    } else {
      await say(`*${userText.split(" ")[1].toUpperCase()}* - symbol not found in binance...`);
    }
  } catch (err) {
    if (err?.response?.data?.msg === "Invalid symbol.") {
      await say(`*${userText.split(" ")[1].toUpperCase()}* - symbol not found in binance exchange...`);
    } else {
      console.error(`Error fetching Binance status for symbol ${userText.split(" ")[1].toUpperCase()}`, err?.response?.data);
      await say(`Error fetching from Binance. please check the symbol name`);
    }
  }
}

async function validateMexcSymbols(userText, say) {
  try {
    const { data } = await axios.get(`https://api.mexc.com/api/v3/exchangeInfo?symbol=${userText.split(" ")[1].toUpperCase()}`);
    if (data?.symbols[0]?.symbol === userText.split(" ")[1].toUpperCase()) {
      await say(`*${userText.split(" ")[1].toUpperCase()}* spot trading status: ${data?.symbols[0]?.isSpotTradingAllowed}`);
    } else {
      await say(`${userText.split(" ")[1].toUpperCase()} symbol not present in mexc exchange`);
    }
  } catch (err) {
    console.error("Fething error from mexc exchange", err);
  }
}

async function validate_okx_symbols(userText, say) {
  console.log(userText.split(" ")[1].toUpperCase());
  const apiKey = "c1faafff-4f74-4acd-b070-f1b08ee0deee";
  const secretKey = "7137CE2DFF453C92127C75E2C285C7C1";
  const passphrase = "Qwerty@123";

  const method = "GET";
  const requestPath = `/api/v5/public/instruments?instType=SPOT&instId=${userText.split(" ")[1].toUpperCase()}`;
  const body = ""; // Empty for GET
  const timestamp = new Date().toISOString();

  const prehash = `${timestamp}${method}${requestPath}${body}`;
  const signature = crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");

  try {
    const { data } = await axios.get(
      `https://www.okx.com${requestPath}`,
      {
        headers: {
          "OK-ACCESS-KEY": apiKey,
          "OK-ACCESS-SIGN": signature,
          "OK-ACCESS-TIMESTAMP": timestamp,
          "OK-ACCESS-PASSPHRASE": passphrase,
          "Content-Type": "application/json",
        },
      },
      { timeout: 5000 }
    );

    if (data?.data[0]?.instId === userText.split(" ")[1].toUpperCase()) {
      await say(`${data?.data[0]?.baseCcy}${data.data[0].quoteCcy} - OKX symbol status: ${data?.data[0]?.state}`);
    } else {
      await say(`${data?.data[0]?.baseCcy}${data.data[0].quoteCcy} - symbol not present in OKX (or) please check the symbol name eg:(BTC-USDT)`);
    }
    catch_count = 0;
  } catch (err) {
    catch_count++;
    if (catch_count < 5) {
      await validate_okx_symbols(userText, say);
    }
    console.error("❌ OKX exchange API error:", err?.response?.data || err?.message);
  }
}

async function validate_karken_symbols(userText, say) {
  try {
    const { data } = await axios(`https://api.kraken.com/0/public/AssetPairs?pair=${userText.split(" ")[1].toUpperCase()}&info=info`, {
      timeout: 5000,
    });

    if (data?.result[`${userText.split(" ")[1].toUpperCase()}`]) {
      await say(`${userText.split(" ")[1].toUpperCase()} - Kraken symbol status: ${data?.result[`${userText.split(" ")[1].toUpperCase()}`]?.status}`);
    } else {
      await say(`${userText.split(" ")[1].toUpperCase()} - symbol not present in Kraken exchange (or) please check the symbol name`);
    }
    catch_count = 0;
  } catch (err) {
    catch_count++;
    if (catch_count < 5) {
      await validate_karken_symbols(userText, say);
    }
  }
}

async function validate_kucoin_symbol(userText, say) {
  try {
    const { data } = await axios(`https://api.kucoin.com/api/v2/symbols/${userText.split(" ")[1].toUpperCase()}`);
    if (data?.data?.symbol === userText.split(" ")[1].toUpperCase()) {
      await say(`${userText.split(" ")[1].toUpperCase()} - Kucoin symbol status: ${data?.data?.enableTrading}`);
    } else {
      await say(`${userText.split(" ")[1].toUpperCase()} - symbol not present in kucoin exchange (or) please check the name eg:(BTC-USDT)`);
    }
  } catch (error) {}
}

export { startSlack, disconnectSymbol, manuallyDisconnected, prioritySymbols, disconnectedUser, pm2Symbol, pm2SymbolStatus };
