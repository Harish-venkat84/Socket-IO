import axios from "axios";
import pkg from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { socketDetails, listOfSymbols } from "./socketIO.js";
import { getExchangeAndSymbol } from "./telegramBot.js";
import { telegramBotCommandStatus } from "./messages.js";
import { startTelegarmBot, disconnectBot } from "./telegramBotCommands.js";
import getSymbols, { other_exchange_pair_validate } from "./getSymbols.js";
import crypto from "crypto";
import validate_gateway_microservice_status from "./system_status.js";
import {
  traderUrl,
  slackAppToken,
  slackBotToken,
  binanceSymbolsUrl,
  mexcSymbolsUrl,
  okxApiKey,
  okxPassphrase,
  okxSecretKey,
  okxSymbolsUrl,
  krakenSymbolsUrl,
  kucoinSymbolsUrl,
} from "./index.js";

const { App } = pkg;
let messageStatus = false;
const disconnectSymbol = new Set();
let disconnectedUser = new Map();
const manuallyDisconnected = new Map();
const prioritySymbols = new Set();
let addedDisconnectSymbol = false;
let addedPrioritySymbols = false;
const pm2Symbol = new Set();
let addedPm2Symbols = false;
const pm2SymbolStatus = new Map();
let other_exchange = false;
const other_exchange_status = new Map();

async function startSlack() {
  const app = new App({
    token: slackBotToken,
    appToken: slackAppToken,
    socketMode: true, // Enables real-time event listening
  });

  app.message(async ({ message, say }) => {
    if (!message?.text) return;

    let userText;
    if (message.text.includes("*")) {
      userText = message.text.replace(/\*/g, "").toLowerCase();
    } else {
      userText = message.text.toLowerCase();
    }

    symbolsStatus(userText, say);

    customMessages(userText, message, say);

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
          \n🔗 URL: ${traderUrl + symbol}`
      );
      break;
    }
  }
}

async function customMessages(userText, message, say) {
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
    case "system status": {
      validate_gateway_microservice_status("bot", say);
      break;
    }
    case "other exchange": {
      validateExchangeSymbols(say);
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
            await validate_kraken_symbols(userText, say);
            break;
          }
          case "kucoin": {
            await validate_kucoin_symbol(userText, say);
            break;
          }
          default: {
            if (message?.user) {
              await say(`*${userText}* - please check the command name (or) enter *help* to see the list of commands`);
            }
            break;
          }
        }
      } else {
        if (userText.includes("-")) {
          addSymbolsToDisconnect(userText, say, message);
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
    *symbols name* eg(BTCUSDT) - To validate last updated timestamp for (orderbook, candlestick, ticket)\n
    *-symbol name* eg(-ETHUSDT) - To manually disconnect the socket for this symbol\n
    *+symbol name* eg(+ETHUSDT) - To re-connect the manually disconnect socket\n
    *disconnected symbols* - List of symbols manually disconnected by slack user\n
    *add symbol name* eg(add ETHUSDT) - To add to priority symbols for candlestick 60 seconds\n
    *delete symbol name* eg(delete ETHUSDT) - To delete the symbols from priority\n
    *priority symbols* - list of symbols added to priority for candlestick 60 seconds\n
    *pm2_add symbol name* eg(pm2_add ETHUSDT) - To add to pm2 symbols\n
    *pm2_delete symbol name* eg(pm2_delete ETHUSDT) - To delete the symbols from pm2 list\n
    *pm2 symbols* - list of symbols added to pm2\n
    *system status* - To check *Microservice* & *Gateway* status\n
    *binance BTCUSDT* - To check symbol status in Binance exchange\n
    *mexc BTCUSDT* - To check symbol status in MEXC exchange\n
    *okx BTC-USDT* - To check symbol status in OKX exchange\n
    *kraken BTCUSDT* To check symbol status in Kraken exchange\n
    *kucoin BTCU-SDT* - To check symbol status in Kraken exchange\n
    *other exchange* - To validate (Binance, MEXC, Kraken, OKX, kucoin) exchanges symbols status`);
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

async function addSymbolsToDisconnect(userText, say, message) {
  let userInfo;
  try {
    const web = new WebClient(slackBotToken);
    userInfo = await web.users.info({ user: message.user });
  } catch (error) {
    console.log("error getting slack user name");
  }
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

async function validateBinanceSymbols(userText, say, messageStatus = true) {
  const symbolName = userText.split(" ")[1].toUpperCase();
  if (symbolName.includes("-")) {
    await say(`${symbolName} - please enter symbol name as given example => *BTCUSDT* for binance exchange`);
    return;
  }
  try {
    let binance_ulr = `${binanceSymbolsUrl}${symbolName}`;
    const response = await axios.get(binance_ulr);
    if (response.data?.symbols[0]?.symbol === symbolName && messageStatus) {
      await say(`Binance symbol status: *${symbolName} - ${response.data?.symbols[0]?.status}*`);
    } else if (response.data?.symbols[0]?.symbol === symbolName && !messageStatus && response.data?.symbols[0]?.status !== "TRADING") {
      other_exchange = true;
      other_exchange_status.set(symbolName, {
        status: false,
        exchange_staus: response.data?.symbols[0]?.status,
        exchange_name: "Binance",
      });
      // await say(`Binance symbol status: *${symbolName} - ${response.data?.symbols[0]?.status}*`);
    } else if (messageStatus) {
      await say(`*${symbolName}* - symbol not found in binance...`);
    }
  } catch (err) {
    if (err?.response?.data?.msg === "Invalid symbol.") {
      await say(`*${symbolName}* - symbol not found in binance exchange (or) please check the symbol name`);
    } else {
      other_exchange = true;
      console.error(`Error fetching Binance status for symbol ${symbolName}`, err?.response?.data);
      await say(`Error fetching ${symbolName} symbol from Binance exchange, please try again...`);
    }
  }
}

async function validateMexcSymbols(userText, say, messageStatus = true) {
  const symbolName = userText.split(" ")[1].toUpperCase();
  if (symbolName.includes("-")) {
    await say(`${symbolName} - please enter symbol name as given example => *BTCUSDT* for MECX exchange`);
    return;
  }
  try {
    const { data } = await axios.get(`${mexcSymbolsUrl}${symbolName}`);
    if (data?.symbols[0]?.symbol === symbolName && messageStatus) {
      await say(`*${symbolName}* spot trading status: ${data?.symbols[0]?.isSpotTradingAllowed}`);
    } else if (data?.symbols[0]?.symbol === symbolName && !messageStatus && !data?.symbols[0]?.isSpotTradingAllowed) {
      other_exchange = true;
      other_exchange_status.set(symbolName, {
        status: false,
        exchange_staus: data?.symbols[0]?.isSpotTradingAllowed,
        exchange_name: "MEXC",
      });
      // await say(`*${symbolName}* spot trading status: ${data?.symbols[0]?.isSpotTradingAllowed}`);
    } else if (messageStatus) {
      await say(`*${symbolName}* symbol not present in mexc exchange (or) please check the symbol name`);
    }
  } catch (err) {
    other_exchange = true;
    await say(`Error fetching ${symbolName} symbol from MEXC exchange, please try again...`);
  }
}

async function validate_okx_symbols(userText, say, messageStatus = true) {
  const symbolName = userText.split(" ")[1].toUpperCase();
  if (!symbolName.includes("-")) {
    await say(`${symbolName} - please enter symbol name as given example => *BTC-USDT* for OKX exchange`);
    return;
  }
  const apiKey = okxApiKey;
  const secretKey = okxSecretKey;
  const passphrase = okxPassphrase;

  const method = "GET";
  const requestPath = `${okxSymbolsUrl}${symbolName}`;
  const body = ""; // Empty for GET
  const timestamp = new Date().toISOString();

  const prehash = `${timestamp}${method}${requestPath}${body}`;
  const signature = crypto.createHmac("sha256", secretKey).update(prehash).digest("base64");

  try {
    const { data } = await axios.get(
      requestPath,
      {
        headers: {
          "OK-ACCESS-KEY": apiKey,
          "OK-ACCESS-SIGN": signature,
          "OK-ACCESS-TIMESTAMP": timestamp,
          "OK-ACCESS-PASSPHRASE": passphrase,
          "Content-Type": "application/json",
        },
      },
      { timeout: 10000 }
    );

    if (data?.data[0]?.instId === symbolName && messageStatus) {
      await say(`${data?.data[0]?.baseCcy}${data.data[0].quoteCcy} - OKX symbol status: ${data?.data[0]?.state}`);
    } else if (data?.data[0]?.instId === symbolName && !messageStatus && data?.data[0]?.state !== "live") {
      other_exchange = true;
      other_exchange_status.set(symbolName, {
        status: false,
        exchange_staus: data?.data[0]?.state,
        exchange_name: "OKX",
      });
      // await say(`${data?.data[0]?.baseCcy}${data.data[0].quoteCcy} - OKX symbol status: ${data?.data[0]?.state}`);
    } else if (messageStatus) {
      await say(`${data?.data[0]?.baseCcy}${data.data[0].quoteCcy} - symbol not present in OKX (or) please check the symbol name eg:(BTC-USDT)`);
    }
  } catch (err) {
    other_exchange = true;
    await say(`Error fetching ${symbolName} symbol from OKX exchange, please try again...`);
    console.error("❌ OKX exchange API error:", err?.response?.data || err?.message);
  }
}

async function validate_kraken_symbols(userText, say, messageStatus = true) {
  const symbolName = userText.split(" ")[1].toUpperCase();
  if (symbolName.includes("-")) {
    await say(`${symbolName} - please enter symbol name as given example => *BTCUSDT* for kraken exchange`);
    return;
  }
  try {
    const { data } = await axios.get(krakenSymbolsUrl, {
      params: { pair: symbolName },
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Encoding": "gzip, compress, deflate, br",
      },
    });

    if (data?.result) {
      for (const [key, value] of Object.entries(data?.result)) {
        if ((key === symbolName || value?.altname === symbolName) && messageStatus) {
          await say(`${symbolName} - Kraken symbol status: ${value?.status}`);
        } else if ((key === symbolName || value?.altname === symbolName) && !messageStatus && value?.status !== "online") {
          other_exchange = true;
          other_exchange_status.set(symbolName, {
            status: false,
            exchange_staus: value?.status,
            exchange_name: "Kraken",
          });
          // await say(`${symbolName} - Kraken symbol status: ${value?.status}`);
        } else if (messageStatus) {
          await say(`${symbolName} - symbol not present in Kraken exchange (or) please check the symbol name`);
        }
      }
    } else {
      await say(`${symbolName} - symbol not present in Kraken exchange (or) please check the symbol name`);
    }
  } catch (err) {
    other_exchange = true;
    await say(`Error fetching ${symbolName} symbol from Kraken exchange, please try again...`);
  }
}

async function validate_kucoin_symbol(userText, say, messageStatus = true) {
  const symbolName = userText.split(" ")[1].toUpperCase();
  if (!symbolName.includes("-")) {
    await say(`${symbolName} - please enter symbol name as given example => *BTC-USDT*, for kucoin exchange`);
    return;
  }
  try {
    const { data } = await axios.get(`${kucoinSymbolsUrl}${symbolName}`);
    if (data?.data?.symbol === symbolName && messageStatus) {
      await say(`Kucoin *${symbolName}* symbol status: *${data?.data?.enableTrading}*`);
    } else if (data?.data?.symbol === symbolName && !messageStatus && !data?.data?.enableTrading) {
      other_exchange = true;
      other_exchange_status.set(symbolName, {
        status: false,
        exchange_staus: data?.data?.enableTrading,
        exchange_name: "Kucoin",
      });
      // await say(`Kucoin *${symbolName}* symbol status: *${data?.data?.enableTrading}*`);
    } else if (messageStatus) {
      await say(`${symbolName} - symbol not present in kucoin exchange (or) please check the name eg:(BTC-USDT)`);
    }
  } catch (error) {
    other_exchange = true;
    await say(`Error fetching ${symbolName} symbol from Kucoin exchange, please try again...`);
  }
}

async function validateExchangeSymbols(say) {
  if (other_exchange_pair_validate.size > 0) {
    other_exchange_status.clear();
    const exchange_symbols = new Set(); // based on the interval I'm clearing the "other_exchange_pair_validate", so that's why I have created "exchange_symbols"
    other_exchange_pair_validate.forEach((value) => exchange_symbols.add(value));
    await say("please wait it may take sometime....");
    for (const all_symbols of exchange_symbols) {
      if (all_symbols?.BINANCE) {
        const pair = `binance ${all_symbols?.symbol}`;
        validateBinanceSymbols(pair, say, false);
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else if (all_symbols?.OKX) {
        const pair = `okx ${all_symbols?.base_asset}-${all_symbols?.quote_asset}`;
        validate_okx_symbols(pair, say, false);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else if (all_symbols?.MEXC) {
        const pair = `mexc ${all_symbols?.symbol}`;
        validateMexcSymbols(pair, say, false);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else if (all_symbols?.KRAKEN) {
        const pair = `kraken ${all_symbols?.symbol}`;
        validate_kraken_symbols(pair, say, false);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else if (all_symbols?.KUCOIN) {
        const pair = `kucoin ${all_symbols?.base_asset}-${all_symbols?.quote_asset}`;
        validate_kucoin_symbol(pair, say, false);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    exchange_symbols.clear();
  }

  try {
    if (!other_exchange) {
      await say(`✅ other exchange symbols are fine...`);
    } else if (other_exchange_status.size > 0) {
      let results = "";
      for (const [key, value] of other_exchange_status) {
        results = results + `${value?.exchange_name} *${key}* symbol status: *${value?.exchange_staus}*\n`;
      }
      await say(results);
      other_exchange = false;
    }
  } catch (error) {
    console.error("error validate other exchange status");
  }
}

export { startSlack, disconnectSymbol, manuallyDisconnected, prioritySymbols, disconnectedUser, pm2Symbol, pm2SymbolStatus };
