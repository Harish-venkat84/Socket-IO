import {
  feeder,
  stagingSymbolsApi,
  unicoinDcxSymbolsApi,
  zebacusSymbolsApi,
  stagingSocketUrl,
  uniCoinDcxSocketUrl,
  zebacusSocketUrl,
  stagingAdminSettingApi,
  unicoindcxAdminSettingApi,
  zebacusAdminSettingApi,
  stagingFileViewApi,
  unicoindcxFileViewApi,
  zebacusFileViewApi,
} from "./index.js";
import axios from "axios";
import { sendAlertMessage } from "./messages.js";
import { disconnectSymbol } from "./slackBot.js";

const apiUrl = feeder === "staging" ? stagingSymbolsApi : feeder === "unicoindcx" ? unicoinDcxSymbolsApi : zebacusSymbolsApi;
const set_symbols_base_quote = new Set();
let symbolsArray;
let binanceTradePage;

async function getSymbols() {
  set_symbols_base_quote.clear();
  symbolsArray = new Set(
    await axios.get(apiUrl).then((response) =>
      response?.data?.data
        .filter((symbol) => symbol?.spot && symbol?.is_active && !symbol?.is_new)
        .map((data) => {
          if (data?.external_exchanges?.BINANCE === true) {
            set_symbols_base_quote.add({ symbol: data.symbol, base_asset: data.base_asset, quote_asset: data.quote_asset });
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

    return new Set(
      [...symbolsArray]
        .filter((value) => !addurl.has(value))
        .map((value) => {
          if (feeder === "staging") return stagingSocketUrl + "feeder-" + value.toUpperCase();
          else if (feeder === "unicoindcx") return uniCoinDcxSocketUrl + "feeder-" + value.toUpperCase();
          else return zebacusSocketUrl + "feeder-" + value.toUpperCase();
        })
    );
  }

  return new Set(
    [...symbolsArray].map((value) => {
      if (feeder === "staging") return stagingSocketUrl + "feeder-" + value.toUpperCase();
      else if (feeder === "unicoindcx") return uniCoinDcxSocketUrl + "feeder-" + value.toUpperCase();
      else return zebacusSocketUrl + "feeder-" + value.toUpperCase();
    })
  );
}

async function getLogoUrl() {
  let adminUrl;
  let fileViewUrl;
  let logoUrl;

  if (feeder === "staging") {
    adminUrl = stagingAdminSettingApi;
    fileViewUrl = stagingFileViewApi;
  } else if (feeder === "unicoindcx") {
    adminUrl = unicoindcxAdminSettingApi;
    fileViewUrl = unicoindcxFileViewApi;
  } else if (feeder === "zebacus") {
    adminUrl = zebacusAdminSettingApi;
    fileViewUrl = zebacusFileViewApi;
  }
  await axios
    .get(adminUrl)
    .then((data) => (logoUrl = `${fileViewUrl}${data?.data?.logo.logo}`))
    .catch((err) => (logoUrl = "failed"));

  return logoUrl;
}

async function getBinanceSymbolStatus(url, symbolName) {
  for (const value of set_symbols_base_quote) {
    if (value.symbol === symbolName) {
      try {
        let binance_ulr = `https://api.binance.com/api/v3/exchangeInfo?symbol=${value.symbol}`;
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

export default getSymbols;
export { getLogoUrl, getBinanceSymbolStatus, binanceTradePage };