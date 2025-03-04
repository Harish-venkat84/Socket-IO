import { slackChannel } from "./slack.js";
import { getExchangeAndSymbol, telegramBot } from "./telegramBot.js";
import { messageApp, feeder } from "./index.js";

function slackMessage(url, alertMessage) {
  const { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);

  let finalMessage;

  switch (alertMessage) {
    case "orderBookDown":
      finalMessage = getTime() + ` - ❌ *"${symbol}"* 📚 order book down for *"60 seconds"* seconds, need to resolve ASAP - ${exchange}`;
      break;

    case "orderBookUp":
      finalMessage = getTime() + ` - ✅ *"${symbol}"* 📚 order book issue resolved, back to normal - ${exchange}`;
      break;

    case "candlestickDown":
      finalMessage = getTime() + ` - ❌ *"${symbol}"* 📈 candlestick feed down for *"3 minutes"* seconds, need to resolve ASAP - ${exchange}`;
      break;

    case "candlestickUp":
      finalMessage = getTime() + ` - ✅ *"${symbol}"* 📈 candlestick feed issue resolved, back to normal - ${exchange}`;
      break;

    case "symbolChanges":
      finalMessage =
        getTime() +
        ` - 🔄 *"${symbol}"*  symbol status has been changed from Active to "Inactive". The WebSocket connection for this symbol will now be disconnected - ${exchange}`;
      break;

    case "newSymbol":
      finalMessage = getTime() + ` - 🚀 *"${symbol}"* New symbol has been added to the exchange. WebSocket connections updated - ${exchange}`;
      break;

    default:
      finalMessage = getTime() + ` - ⚠️ *"${symbol}" Socket Disconnected!!* - ${exchange}`;
  }

  slackChannel(finalMessage);
}

function telegramBotMessage(url, alertMessage) {
  const { exchange, symbol, exchangeUrl } = getExchangeAndSymbol(url);

  let finalMessage;

  switch (alertMessage) {
    case "orderBookDown":
      finalMessage = getTime() + ` - ❌ "${symbol}" feeder down for 30 seconds seconds, need to resolve ASAP - ${exchange}`;
      break;

    case "orderBookUp":
      finalMessage = getTime() + ` - ✅ "${symbol}" feeder issue resolved, back to normal - ${exchange}`;
      break;

    case "candlestickDown":
      finalMessage = getTime() + ` - ❌ "${symbol}" candlestick feed down for 30 seconds seconds, need to resolve ASAP - ${exchange}`;
      break;

    case "candlestickUp":
      finalMessage = getTime() + ` - ✅ "${symbol}" candlestick feed issue resolved, back to normal - ${exchange}`;
      break;

    case "symbolChanges":
      finalMessage =
        getTime() +
        ` - 🔄 "${symbol}"  symbol status has been changed from Active to "Inactive". The WebSocket connection for this symbol will now be disconnected - ${exchange}`;
      break;

    case "newSymbol":
      finalMessage = getTime() + ` - 🚀 "${symbol}" New symbol has been added to the exchange. WebSocket connections updated - ${exchange}`;
      break;

    default:
      finalMessage = getTime() + ` - ⚠️ "${symbol}" Socket Disconnected!! - ${exchange}`;
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

function sendTotalActiveSymbolsMessage(totalConnectedSymbols, totalActiveSymbols) {
  let count = 0;
  totalConnectedSymbols.forEach((socket) => {
    if (socket.socket.connected) {
      count++;
    }
  });

  telegramBot(`${getTime()} - ✅ Feeder running status: \nTotal Active Sockets: ${count} \nTotal Active Symbols: ${totalActiveSymbols}`, "");
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
    ? `${getTime()} - ✅ Feeder current status: \nExchange: ${exchange} \nTotal Active Sockets: ${count} \nTotal Active Symbols: ${
        listOfSymbols.size
      }`
    : "No active sockets... please wait for the feeders to connect";
}

export { sendAlertMessage, getTime, sendTotalActiveSymbolsMessage, telegramBotCommandStatus };
