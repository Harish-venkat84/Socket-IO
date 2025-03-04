import { io } from "socket.io-client";
import getSymbols from "./getSymbols.js";
import { setIntervalSeconds, socketIntervalSeconds, activeSocketsIntervalSeconds } from "./index.js";
import { getTime, sendAlertMessage, sendTotalActiveSymbolsMessage } from "./messages.js";
import startTelegarmBot from "./telegramBotCommands.js";
import { startSlack } from "./slackBot.js";

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
      disconnected: false,
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

monitorSockets();

setInterval(() => {
  console.log(getTime(), "🔍 Checking for inactive sockets...");
  validateFeederAndCandlestick();
  adminSymbolsValidation();
  socketDisconnected();
  // sendTotalActiveSymbolsMessage(socketDetails, listOfSymbols.size);
}, setIntervalSeconds * 1000);

setInterval(() => validatingCandlestickFeeder(), 180 * 1000);

async function validateFeederAndCandlestick() {
  socketDetails.forEach((socket, url) => {
    // if (Date.now() - socket.candlestick > 180 * 1000) {
    //   sendAlertMessage(url, "candlestickDown");

    //   socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: false });
    // }

    if (Date.now() - socket.order_book > socketIntervalSeconds * 1000) {
      sendAlertMessage(url, "orderBookDown");

      socketDetails.set(url, { ...socketDetails.get(url), order_book_status: false });
    }
  });

  socketDetails.forEach((socket, url) => {
    if (!socket.candlestick_status && Date.now() - socket.candlestick < 180 * 1000) {
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
    if (Date.now() - socket.candlestick > 180 * 1000) {
      sendAlertMessage(url, "candlestickDown");

      socketDetails.set(url, { ...socketDetails.get(url), candlestick_status: false });
    }
  });
}

async function adminSymbolsValidation() {
  let symbolsData = new Set(await getSymbols());

  listOfSymbols.forEach((url) => {
    if (!symbolsData.has(url)) {
      console.log(
        getTime(),
        "🔄 Symbol status has been changed from Active to Inactive. The WebSocket connection for this symbol will now be disconnected -",
        url
      );
      listOfSymbols.delete(url);
      socketDetails.get(url).socket.off();
      socketDetails.get(url).socket.disconnect();
      socketDetails.delete(url);
      sendAlertMessage(url, "symbolChanges");
    }
  });

  symbolsData.forEach((url) => {
    if (!listOfSymbols.has(url)) {
      console.log(getTime(), "🚀 New symbol has been added to the exchange. WebSocket connections updated -", url);
      listOfSymbols.add(url);
      connectSockets(url);
      sendAlertMessage(url, "newSymbol");
    }
  });
}

async function socketDisconnected() {
  socketDetails.forEach((socket, url) => {
    if (socket.disconnected && !socket.connection) {
      console.log(getTime(), "❌ Disconnected from", url);
      socketDetails.get(url).socket.off();
      socketDetails.get(url).socket.disconnect();
      connectSockets(url);
      sendAlertMessage(url, "default");
      socketDetails.delete(url);
    }
  });
}

// startTelegarmBot();

startSlack();

export { listOfSymbols, socketDetails };
