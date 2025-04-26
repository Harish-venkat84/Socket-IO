import axios from "axios";
import { getLogoUrl } from "./getSymbols.js";
import { traderUrl, telegramBotToken, telegramBotChatId, telegramGroupChatId } from "./index.js";

const telegramBotApiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;
const url = traderUrl;

export async function telegramBot(message, symbol) {
  const imageUrl = await getLogoUrl();
  const finalImageUrl =
    imageUrl !== "failed"
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

export function telegramGroup(message, symbol) {
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

export function getExchangeAndSymbol(socketUrl) {
  let exchange = socketUrl.includes("staging") ? "PIX-Staging" : socketUrl.includes("unicoindcx") ? "UniCoinDCX" : "zebacus";

  let symbol = socketUrl.split("/")[3].substring(7).toUpperCase();

  let exchangeUrl = traderUrl + symbol;

  return { exchange, symbol, exchangeUrl };
}
