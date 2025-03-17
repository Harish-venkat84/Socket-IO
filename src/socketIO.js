import { io } from "socket.io-client";
import getSymbols from "./getSymbols.js";
import { setIntervalSeconds, socketIntervalSeconds, activeSocketsIntervalSeconds, socketCandleStickSeconds } from "./index.js";
import { getTime, sendAlertMessage, sendTotalActiveSymbolsMessage } from "./messages.js";
import { startTelegarmBot } from "./telegramBotCommands.js";
import { startSlack, manuallyconnected, prioritySymbols } from "./slackBot.js";
import { getExchangeAndSymbol } from "./telegramBot.js";

let listOfSymbols;
const socketDetails = new Map();

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
    validatingCandlestickFeeder(); //<=====================
    if (count === activeSocketsIntervalSeconds) {
      sendTotalActiveSymbolsMessage(socketDetails, listOfSymbols.size);
      count = 0;
    }
  }, setIntervalSeconds * 1000);

  // setInterval(() => validatingCandlestickFeeder(), socketCandleStickSeconds * 1000);
}

async function validateFeederAndCandlestick() {
  socketDetails.forEach((socket, url) => {
    if (Date.now() - socket.order_book > socketIntervalSeconds * 1000) {
      sendAlertMessage(url, "orderBookDown");

      socketDetails.set(url, { ...socketDetails.get(url), order_book_status: false });
    }
  });

  socketDetails.forEach((socket, url) => {
    if (!socket.candlestick_status && Date.now() - socket.candlestick < 60 * 1000) {
      sendAlertMessage(url, "candlestickUp");

      socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: true });
    }

    if (!socket.order_book_status && Date.now() - socket.order_book < socketIntervalSeconds * 1000) {
      sendAlertMessage(url, "orderBookUp");

      socketDetails.set(url, { ...socketDetails.get(url), order_book_status: true });
    }
  });
}

function validatingCandlestickFeeder() {
  socketDetails.forEach((socket, url) => {
    let { symbol } = getExchangeAndSymbol(url);
    if (Date.now() - socket.candlestick > socketCandleStickSeconds * 1000 && !prioritySymbols.has(symbol.toLowerCase())) {
      sendAlertMessage(url, "candlestickDown");
      socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: false });
    } else if (Date.now() - socket.candlestick > 60 * 1000 && prioritySymbols.has(symbol.toLowerCase())) {
      sendAlertMessage(url, "candlestickDownOneMinute");
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
      if (manuallyconnected.get(symbol.toLowerCase())?.disconnected) {
        console.log(getTime(), "user manually disconnected the socket for this symbol", url);
        manuallyconnected.set(symbol.toLowerCase(), { disconnected: false });
      } else {
        sendAlertMessage(url, "symbolChanges");
        console.log(
          getTime(),
          "🔄 Symbol status has been changed from Active to Inactive. The WebSocket connection for this symbol will now be disconnected -",
          url
        );
      }
    }
  });

  symbolsData.forEach((url) => {
    if (!listOfSymbols.has(url)) {
      listOfSymbols.add(url);
      connectSockets(url);
      let { symbol } = getExchangeAndSymbol(url);
      if (manuallyconnected.get(symbol.toLowerCase())?.disconnected) {
        console.log(getTime(), "user manually re-connected the socket for this symbol", url);
        manuallyconnected.set(symbol.toLowerCase(), { disconnected: false });
      } else {
        sendAlertMessage(url, "newSymbol");
        console.log(getTime(), "🚀 New symbol has been added to the exchange. WebSocket connections updated -", url);
      }
    }
  });
}

async function socketDisconnected() {
  socketDetails.forEach((socket, url) => {
    if (socket.disconnected && !socket.connection) {
      socketDetails.get(url).socket.off();
      socketDetails.get(url).socket.disconnect();
      socketDetails.delete(url);
      connectSockets(url);
      // sendAlertMessage(url, "default");
    }
  });
}

monitorSockets();

start();

// startTelegarmBot();

setTimeout(() => startSlack(), 5000);

export { listOfSymbols, socketDetails };
