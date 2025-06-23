import {
  socketUrl,
  adminSetting,
  traderFileView,
  binanceSymbolsUrl,
  exchange_gateway,
  exchange_public_token,
} from "./index.js";
import axios from "axios";
import { sendAlertMessage } from "./messages.js";
import { disconnectSymbol } from "./slackBot.js";

export const otherExchangePairValidate = new Set();
let symbolsArray = new Set();
export let binanceTradePage;

export default async function getSymbols() {
  try {
    const { data, status } = await axios.get(
      `${exchange_gateway}/pix/symbols/all`,
      {
        headers: {
          authorization: exchange_public_token,
        },
      }
    );
    if (status === 200) {
      if (data?.data) {
        symbolsArray.clear();
        otherExchangePairValidate.clear();
        const symbols = data?.data || [];
        symbols.forEach((item) => {
          if (
            item?.spot &&
            item?.is_active &&
            !item?.is_new &&
            !item?.is_test_symbol &&
            !disconnectSymbol.has(item?.symbol?.toLowerCase())
          ) {
            if (item?.external_exchanges) {
              otherExchangePairValidate.add({
                symbol: item.symbol,
                base_asset: item.base_asset,
                quote_asset: item.quote_asset,
                ...item.external_exchanges,
              });
            }
            symbolsArray.add(item.symbol);
          }
        });

        return new Set(
          [...symbolsArray].map(
            (symbol) => `${socketUrl}feeder-${symbol.toUpperCase()}`
          )
        );
      }
    } else {
      return new Set(
        [...symbolsArray].map(
          (symbol) => `${socketUrl}feeder-${symbol.toUpperCase()}`
        )
      );
    }
  } catch (error) {
    console.error("Error fetching symbols:", error);
    return new Set(
      [...symbolsArray].map(
        (symbol) => `${socketUrl}feeder-${symbol.toUpperCase()}`
      )
    );
  }
}

export async function getLogoUrl() {
  try {
    const { data } = await axios.get(adminSetting);
    return `${traderFileView}${data?.logo?.logo}`;
  } catch (err) {
    return "failed";
  }
}

export async function getBinanceSymbolStatus(url, symbolName) {
  for (const value of otherExchangePairValidate) {
    if (value.symbol === symbolName && value.BINANCE) {
      try {
        let binance_ulr = `${binanceSymbolsUrl}${value.symbol}`;
        const response = await axios(binance_ulr);
        if (response.data?.symbols[0]?.status === "BREAK") {
          binanceTradePage = `https://www.binance.com/en-IN/trade/${value.base_asset}_${value.quote_asset}?type=spot`;
          sendAlertMessage(url, "binanceSymbolBreak");
          // disconnectSymbol.add(value.symbol); {if u want to automatically disconnect the symbol from the socket}
        }
      } catch (err) {
        console.error(
          `Error fetching Binance status for symbol ${value.symbol}:`
        );
      }
    }
  }
}
