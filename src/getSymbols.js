import { traderSymbolApi, socketUrl, adminSetting, traderFileView, binanceSymbolsUrl } from "./index.js";
import axios from "axios";
import { sendAlertMessage } from "./messages.js";
import { disconnectSymbol } from "./slackBot.js";

const set_symbols_base_quote = new Set();
export const other_exchange_pair_validate = new Set();
let symbolsArray;
export let binanceTradePage;

export default async function getSymbols() {
  set_symbols_base_quote.clear();
  other_exchange_pair_validate.clear();
  symbolsArray = new Set(
    await axios.get(traderSymbolApi).then((response) =>
      response?.data?.data
        .filter((symbol) => symbol?.spot && symbol?.is_active && !symbol?.is_new)
        .map((data) => {
          if (data?.external_exchanges?.BINANCE === true) {
            set_symbols_base_quote.add({ symbol: data.symbol, base_asset: data.base_asset, quote_asset: data.quote_asset });
          }
          if (data?.external_exchanges) {
            other_exchange_pair_validate.add({
              symbol: data.symbol,
              base_asset: data.base_asset,
              quote_asset: data.quote_asset,
              ...data.external_exchanges,
            });
          }
          return data.symbol;
        })
    )
  );

  if (disconnectSymbol.size > 0) {
    let addurl = new Set();
    disconnectSymbol.forEach((value) => {
      addurl.add(value.toUpperCase());
    });

    return new Set([...symbolsArray].filter((value) => !addurl.has(value)).map((value) => socketUrl + "feeder-" + value.toUpperCase()));
  }

  return new Set([...symbolsArray].map((value) => socketUrl + "feeder-" + value.toUpperCase()));
}

export async function getLogoUrl() {
  let logoUrl;

  await axios
    .get(adminSetting)
    .then((data) => (logoUrl = `${traderFileView}${data?.data?.logo.logo}`))
    .catch((err) => (logoUrl = "failed"));

  return logoUrl;
}

export async function getBinanceSymbolStatus(url, symbolName) {
  for (const value of set_symbols_base_quote) {
    if (value.symbol === symbolName) {
      try {
        let binance_ulr = `${binanceSymbolsUrl}${value.symbol}`;
        const response = await axios(binance_ulr);
        if (response.data?.symbols[0]?.status === "BREAK") {
          binanceTradePage = `https://www.binance.com/en-IN/trade/${value.base_asset}_${value.quote_asset}?type=spot`;
          sendAlertMessage(url, "binanceSymbolBreak");
          // disconnectSymbol.add(value.symbol); {if u want to automatically disconnect the symbol from the socket}
        }
      } catch (err) {
        console.error(`Error fetching Binance status for symbol ${value.symbol}:`);
      }
    }
  }
}
