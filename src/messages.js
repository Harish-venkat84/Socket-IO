import { slackChannel } from "./slack.js";
import { getExchangeAndSymbol, telegramBot } from "./telegramBot.js";
import { messageApp, feeder } from "./index.js";
import { disconnectSymbol, prioritySymbols } from "./slackBot.js";
import { socketIntervalSeconds, socketCandleStickSeconds, stagingUrl, uniCoinDcxUrl, zebacusUrl } from "./index.js";
import { binanceTradePage } from "./getSymbols.js";

function slackMessage(url, alertMessage) {
  const { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);
  const websiteUrl = `${feeder === "staging" ? stagingUrl : feeder === "unicoindcx" ? uniCoinDcxUrl : zebacusUrl}`;

  let finalMessage;
  let webUrl = websiteUrl + symbol;

  switch (alertMessage) {
    case "orderBookDown":
      finalMessage =
        getTime() +
        `\n❌ *"${symbol}"* - 📚 order book down for *"${socketIntervalSeconds} seconds"* seconds, need to resolve ASAP - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "orderBookUp":
      finalMessage = getTime() + `\n✅ *"${symbol}"* - 📚 order book issue resolved, back to normal - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "candlestickDown":
      finalMessage =
        getTime() +
        `\n❌ *"${symbol}"* - 📈 candlestick down for *"${
          socketCandleStickSeconds / 60
        } minutes"*, need to resolve ASAP - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "candlestickDownOneMinute":
      finalMessage =
        getTime() +
        `\n❌ *"${symbol}"* - 📈 candlestick down for *"${socketIntervalSeconds} seconds"*, need to resolve ASAP - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "candlestickUp":
      finalMessage = getTime() + `\n✅ *"${symbol}"* - 📈 candlestick issue resolved, back to normal - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "symbolChanges":
      finalMessage =
        getTime() +
        `\n🔄 *"${symbol}"* - symbol status has been changed from Active to "Inactive".The WebSocket connection for this symbol will now be disconnected - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "newSymbol":
      finalMessage =
        getTime() + `\n🚀 *"${symbol}"* - New symbol has been added to the exchange. WebSocket connections updated - *${exchange}*\n🔗: ${webUrl}`;
      break;

    case "binanceSymbolBreak":
      finalMessage =
        getTime() + `\n🟡 *${symbol}* - Binance changed the symbol status from Trading to *"BREAK"* - *${exchange}*\n🔗: ${binanceTradePage}`;
      break;

    default:
      finalMessage = getTime() + `\n⚠️ *"${symbol}" - Socket Disconnected!!* - *${exchange}*\n🔗: ${webUrl}`;
  }

  slackChannel(finalMessage);
}

function telegramBotMessage(url, alertMessage) {
  const { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);

  let finalMessage;

  switch (alertMessage) {
    case "orderBookDown":
      finalMessage =
        getTime() + `\n❌ "${symbol}" - 📚 order book down for "${socketIntervalSeconds} seconds" seconds, need to resolve ASAP - ${exchange}`;
      break;

    case "orderBookUp":
      finalMessage = getTime() + `\n✅ "${symbol}" - 📚 order book issue resolved, back to normal - ${exchange}`;
      break;

    case "candlestickDown":
      finalMessage =
        getTime() + `\n❌ "${symbol}" - 📈 candlestick down for "${socketCandleStickSeconds / 60} minutes", need to resolve ASAP - ${exchange}`;
      break;

    case "candlestickDownOneMinute":
      finalMessage = getTime() + `\n❌ "${symbol}" - 📈 candlestick down for "1 minute", need to resolve ASAP - ${exchange}`;
      break;

    case "candlestickUp":
      finalMessage = getTime() + `\n✅ "${symbol}" - 📈 candlestick issue resolved, back to normal - ${exchange}`;
      break;

    case "symbolChanges":
      finalMessage =
        getTime() +
        `\n🔄 "${symbol}" - symbol status has been changed from Active to "Inactive".The WebSocket connection for this symbol will now be disconnected - ${exchange}`;
      break;

    case "newSymbol":
      finalMessage = getTime() + `\n🚀 "${symbol}" - New symbol has been added to the exchange. WebSocket connections updated - ${exchange}`;
      break;

    case "binanceSymbolBreak":
      finalMessage =
        getTime() + `\n🟡 "${symbol}" - Binance changed the symbol status from Trading to "BREAK" - ${exchange}\n🔗: ${binanceTradePage}`;
      break;

    default:
      finalMessage = getTime() + `\n⚠️ "${symbol}" - Socket Disconnected!! - ${exchange}`;
  }

  telegramBot(finalMessage, symbol);
}

function getTime() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-GB", options).format(now);
}

function sendAlertMessage(url, alertMessage) {
  if (messageApp === "slack") {
    slackMessage(url, alertMessage);
  } else {
    telegramBotMessage(url, alertMessage);
  }
}

function telegramBotCommandStatus(activeSockets, listOfSymbols) {
  const exchange = `${feeder === "staging" ? "PIX-Staging" : feeder === "unicoindcx" ? "UniCoinDCX" : "Zebacus"}`;
  let count = 0;
  activeSockets.forEach((socket) => {
    if (socket.socket.connected) {
      count++;
    }
  });

  return activeSockets.size > 0 && listOfSymbols.size > 0
    ? `${getTime()}
        \n✅ Sockets current status: 
        \nExchange: ${exchange} 
        \nTotal Active Symbols in the Exchange: ${listOfSymbols.size + disconnectSymbol.size}
        \nTotal Active Sockets: ${count}
        \nTotal Manually Disconnected Symbols: ${disconnectSymbol.size}
        \nTotal Priority Symbols: ${prioritySymbols.size}
        `
    : "No active sockets... please wait for socket to connect";
}

export { sendAlertMessage, getTime, telegramBotCommandStatus };
