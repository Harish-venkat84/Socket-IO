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
import { disconnectSymbol } from "./slackBot.js";

const apiUrl = feeder === "staging" ? stagingSymbolsApi : feeder === "unicoindcx" ? unicoinDcxSymbolsApi : zebacusSymbolsApi;

async function getSymbols() {
  let symbolsArray = new Set(
    await axios.get(apiUrl).then((response) =>
      response?.data?.data
        .filter((symbol) => symbol?.spot && symbol?.is_active && !symbol?.is_new)
        .map((data) => {
          if (feeder === "staging") return stagingSocketUrl + "feeder-" + data.symbol;
          else if (feeder === "unicoindcx") return uniCoinDcxSocketUrl + "feeder-" + data.symbol;
          else return zebacusSocketUrl + "feeder-" + data.symbol;
        })
    )
  );

  if (disconnectSymbol.size > 0) {
    let addurl = new Set();
    disconnectSymbol.forEach((value) => {
      if (feeder === "staging") addurl.add(stagingSocketUrl + "feeder-" + value.toUpperCase());
      else if (feeder === "unicoindcx") addurl.add(uniCoinDcxSocketUrl + "feeder-" + value.toUpperCase());
      else addurl.add(zebacusSocketUrl + "feeder-" + value.toUpperCase());
    });

    let finalData = new Set([...symbolsArray].filter((value) => !addurl.has(value)));

    return finalData;
  }

  return symbolsArray;
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
    .catch((err) => console.log(err));

  return logoUrl;
}

export default getSymbols;
export { getLogoUrl };