import {
  feeder,
  stagingSymbolsApi,
  unicoinDcxSymbolsApi,
  zebacusSymbolsApi,
  stagingSocketUrl,
  uniCoinDcxSocketUrl,
  zebacusSocketUrl,
} from "./index.js";

const apiUrl = feeder === "staging" ? stagingSymbolsApi : feeder === "unicoindcx" ? unicoinDcxSymbolsApi : zebacusSymbolsApi;
async function symbolsData() {
  const response = await fetch(apiUrl);
  const data = await response.json();
  return data;
}

async function getSymbols() {
  let symbolsArray = await symbolsData().then((data) =>
    data.data
      .filter((symbol) => symbol.spot && symbol?.is_active)
      .map((data) => {
        if (feeder === "staging") return stagingSocketUrl + "feeder-" + data.symbol;
        else if (feeder === "unicoindcx") return uniCoinDcxSocketUrl + "feeder-" + data.symbol;
        else return zebacusSocketUrl + "feeder-" + data.symbol;
      })
  );
  return symbolsArray;
}

export default getSymbols;
