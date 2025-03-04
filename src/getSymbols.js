import {
  feeder,
  stagingSymbolsApi,
  unicoinDcxSymbolsApi,
  zebacusSymbolsApi,
  stagingSocketUrl,
  uniCoinDcxSocketUrl,
  zebacusSocketUrl,
} from "./index.js";
import axios from "axios";

const apiUrl = feeder === "staging" ? stagingSymbolsApi : feeder === "unicoindcx" ? unicoinDcxSymbolsApi : zebacusSymbolsApi;

async function getSymbols() {
  let symbolsArray = await axios.get(apiUrl).then((response) =>
    response.data.data
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
