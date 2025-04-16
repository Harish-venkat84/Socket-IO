import { io } from "socket.io-client";
import getSymbols, { getBinanceSymbolStatus } from "./getSymbols.js";
import {
  setIntervalSeconds,
  socketIntervalSeconds,
  activeSocketsIntervalSeconds,
  socketCandleStickSeconds,
  pm2RestartIntervalSeconds,
} from "./index.js";
import { getTime, sendAlertMessage, telegramBotCommandStatus } from "./messages.js";
import { startTelegarmBot } from "./telegramBotCommands.js";
import { startSlack, manuallyDisconnected, prioritySymbols, disconnectSymbol, disconnectedUser, pm2Symbol, pm2SymbolStatus } from "./slackBot.js";
import { getExchangeAndSymbol, telegramBot } from "./telegramBot.js";
import { alertManager } from "./slack.js";

let listOfSymbols;
const socketDetails = new Map();
let alertManagerCount = 0;

function connectSockets(url) {
  const socket = io(url, { path: "/feeder" }, { autoConnect: false });

  socket.on("connect", () => {
    console.log(getTime(), "✅ Connected:", url);
    socketDetails.set(url, {
      socket: socket,
      connection: true,
      lastConnected: getTime(),
      order_book_status: true,
      order_book: Date.now(),
      order_book_lastUpdated: getTime(),
      candlestick_status: true,
      candlestick: Date.now(),
      candlestick_lastUpdated: getTime(),
      ticker_lastUpdated: getTime(),
      disconnected: false,
      last_price: "last price not updated",
    });
  });

  socket.on("events", (data) => {
    if (data.event === "order_book") {
      socketDetails.set(url, {
        ...socketDetails.get(url),
        order_book: Date.now(),
        disconnected: false,
        order_book_lastUpdated: getTime(),
        connection: true,
      });
    } else if (data.event === "trade") {
      socketDetails.set(url, {
        ...socketDetails.get(url),
        candlestick: Date.now(),
        disconnected: false,
        candlestick_lastUpdated: getTime(),
        connection: true,
      });
    } else if (data.event === "ticker") {
      socketDetails.set(url, {
        ...socketDetails.get(url),
        disconnected: false,
        connection: true,
        ticker_lastUpdated: getTime(),
        last_price: data.data.last_price,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(getTime(), "❌ Disconnected from", url);
    socketDetails.set(url, {
      ...socketDetails.get(url),
      disconnectedTime: getTime(),
      disconnected: true,
      connection: false,
    });
  });

  socket.on("connect_error", (error) => {
    console.error(getTime(), "⚠️ Connection error:", error);
  });
}

async function monitorSockets() {
  listOfSymbols = new Set(await getSymbols());
  listOfSymbols.forEach((url) => {
    connectSockets(url);
  });
}

async function start() {
  let count = 0;

  setInterval(() => {
    count++;
    console.log(getTime(), "🔍 Checking for inactive sockets...");
    validateFeederAndCandlestick();
    adminSymbolsValidation();
    socketDisconnected();
    if (count === activeSocketsIntervalSeconds) {
      telegramBot(`${telegramBotCommandStatus(socketDetails, listOfSymbols)}`, "");
      count = 0;
    }
  }, setIntervalSeconds * 1000);

  setInterval(() => validatingCandlestickFeeder(), socketCandleStickSeconds * 1000);
}

async function validateFeederAndCandlestick() {
  socketDetails.forEach(async (socket, url) => {
    let { symbol } = getExchangeAndSymbol(url);
    if (Date.now() - socket.order_book > socketIntervalSeconds * 1000) {
      sendAlertMessage(url, "orderBookDown");
      socketDetails.set(url, { ...socketDetails.get(url), order_book_status: false });
      await getBinanceSymbolStatus(url, symbol);
    } else if (!socket.order_book_status && Date.now() - socket.order_book < socketIntervalSeconds * 1000) {
      sendAlertMessage(url, "orderBookUp");
      socketDetails.set(url, { ...socketDetails.get(url), order_book_status: true });
      // if (alertManagerCount > 0 && pm2Symbol.has(symbol.toLowerCase()) && pm2SymbolStatus.get(symbol.toLowerCase()).status) {
      //   pm2SymbolStatus.set(symbol.toLowerCase(), { status: false });
      //   alertManagerCount = 0;
      //   console.log(getTime(), "pm2 restarted successfully:", symbol);
      // }
    }

    if (Date.now() - socket.candlestick > socketIntervalSeconds * 1000 && prioritySymbols.has(symbol.toLowerCase())) {
      sendAlertMessage(url, "candlestickDownOneMinute");
      socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: false });
    } else if (!socket.candlestick_status && Date.now() - socket.candlestick < socketIntervalSeconds * 1000) {
      sendAlertMessage(url, "candlestickUp");
      socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: true });
    }
  });
}

function validatingCandlestickFeeder() {
  socketDetails.forEach((socket, url) => {
    let { symbol } = getExchangeAndSymbol(url);
    if (Date.now() - socket.candlestick > socketCandleStickSeconds * 1000 && !prioritySymbols.has(symbol.toLowerCase())) {
      sendAlertMessage(url, "candlestickDown");
      socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: false });
    }
  });
}

async function adminSymbolsValidation() {
  let symbolsData = new Set(await getSymbols());
  listOfSymbols.forEach((url) => {
    if (!symbolsData.has(url)) {
      listOfSymbols.delete(url);
      socketDetails.get(url).socket.off();
      socketDetails.get(url).socket.disconnect();
      socketDetails.delete(url);
      let { symbol } = getExchangeAndSymbol(url);
      if (manuallyDisconnected.get(symbol.toLowerCase())?.disconnected) {
        console.log(getTime(), "user manually disconnected the socket for this symbol", url);
        manuallyDisconnected.set(symbol.toLowerCase(), { disconnected: false });
      } else {
        sendAlertMessage(url, "symbolChanges");
        console.log(
          getTime(),
          "🔄 Symbol status has been changed from Active to Inactive. The WebSocket connection for this symbol will now be disconnected -",
          url
        );

        if (disconnectSymbol.has(symbol.toLowerCase())) {
          disconnectSymbol.delete(symbol.toLowerCase());
          manuallyDisconnected.delete(symbol.toLowerCase());
          disconnectedUser.forEach((value, key) => {
            if (key === symbol.toUpperCase()) {
              disconnectedUser.delete(key);
            }
          });
        }

        if (prioritySymbols.has(symbol.toLowerCase())) {
          prioritySymbols.delete(symbol.toLowerCase());
        }
      }
    }
  });

  symbolsData.forEach((url) => {
    if (!listOfSymbols.has(url)) {
      listOfSymbols.add(url);
      connectSockets(url);
      let { symbol } = getExchangeAndSymbol(url);
      if (manuallyDisconnected.get(symbol.toLowerCase())?.disconnected) {
        console.log(getTime(), "user manually re-connected the socket for this symbol", url);
        manuallyDisconnected.set(symbol.toLowerCase(), { disconnected: false });
      } else {
        sendAlertMessage(url, "newSymbol");
        console.log(getTime(), "🚀 New symbol has been added to the exchange. WebSocket connections updated -", url);
      }
    }
  });
}

async function socketDisconnected() {
  socketDetails.forEach((socket, url) => {
    let socketUrl = url;
    if (socket.disconnected && !socket.connection) {
      socketDetails.get(url).socket.off();
      socketDetails.get(url).socket.disconnect();
      socketDetails.delete(url);
      // sendAlertMessage(socketUrl, "default");
      connectSockets(socketUrl);
    }
  });
}

// setInterval(() => {
//   socketDetails.forEach((socket, url) => {
//     let { symbol } = getExchangeAndSymbol(url);
//     if (Date.now() - socket.order_book > pm2RestartIntervalSeconds * 1000) {
//       if (alertManagerCount === 0 && pm2Symbol.has(symbol.toLowerCase()) && !pm2SymbolStatus.get(symbol.toLowerCase()).status) {
//         pm2SymbolStatus.set(symbol.toLowerCase(), { status: true });
//         alertManager();
//         console.log(
//           getTime(),
//           `pm2 restart initiated due to this symbol 'order book' has been down for ${pm2RestartIntervalSeconds / 60} minutes: "${symbol}"`
//         );
//         alertManagerCount++;
//       }
//     }
//   });
// }, pm2RestartIntervalSeconds * 1000);

monitorSockets();

start();

// startTelegarmBot();

setTimeout(() => startSlack(), 5000);

export { listOfSymbols, socketDetails };
