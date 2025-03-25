import axios from "axios";
import { getLogoUrl } from "./getSymbols.js";
import { feeder, getTelegramBotToken, telegramBotChatId, telegramGroupChatId, stagingUrl, uniCoinDcxUrl, zebacusUrl } from "./index.js";

const telegramBotApiUrl = `https://api.telegram.org/bot${getTelegramBotToken()}/sendPhoto`;
const url = `${feeder === "staging" ? stagingUrl : feeder === "unicoindcx" ? uniCoinDcxUrl : zebacusUrl}`;

function telegramBot(message, symbol) {
  const imageUrl = getLogoUrl();
  const finalImageUrl = imageUrl
    ? imageUrl
    : "https://images.pexels.com/photos/163728/dead-end-sign-cul-de-sac-hopeless-163728.jpeg?auto=compress&cs=tinysrgb&w=600";
  const chatId = telegramBotChatId;
  axios
    .post(telegramBotApiUrl, {
      chat_id: chatId,
      caption: message,
      photo: finalImageUrl,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Website",
              url: `${url}${symbol}`,
            },
          ],
        ],
      },
    })
    .then((response) => {
      //   console.log("Message sent:", response.data);
    })
    .catch((error) => {
      //   console.error("Error:", error);
    });
}

function telegramGroup(message, symbol) {
  const chat_id = telegramGroupChatId;
  axios
    .post(telegramBotApiUrl, {
      chat_id: chat_id,
      caption: message,
      photo: imageUrl,
      reply_markup: {
        inline_keyboard: [[{ text: "Open Website", url: `${url}${symbol}` }]],
      },
    })
    .then((res) => {})
    .catch((res) => {});
}

function getExchangeAndSymbol(socketUrl) {
  let exchange = socketUrl.includes("staging") ? "PIX-Staging" : socketUrl.includes("unicoindcx") ? "UniCoinDCX" : "zebacus";

  let symbol = socketUrl.split("/")[3].substring(7).toUpperCase();

  let exchangeUrl = exchange === "PIX-Staging" ? stagingUrl + symbol : exchange === "UniCoinDCX" ? uniCoinDcxUrl + symbol : zebacusUrl + symbol;

  return { exchange, symbol, exchangeUrl };
}

export { telegramBot, telegramGroup, getExchangeAndSymbol };
