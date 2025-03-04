import dotenv from "dotenv";
dotenv.config({ path: ".././.env" });

const feeder = process.env.FEEDER;
const messageApp = process.env.MESSAGE_APP;

const setIntervalSeconds = Number(process.env.SETENTERVAL_SECONDS);
const socketIntervalSeconds = Number(process.env.SOCKET_INTERVAL_SECONDS);
const socketCandleStickSeconds = Number(process.env.SOCKET_CANDLESTICK_SECONDS);
const activeSocketsIntervalSeconds = Number(process.env.ACTIVE_SOCKETS_INTERVAL_SECONDS);

const slackStagingBotToken = process.env.SLACK_STAGING_BOT_TOKEN;
const slackStagingAppToken = process.env.SLACK_STAGING_APP_TOKEN;

const slackUnicoinDcxBotToken = process.env.SLACK_UNICOINDCX_BOT_TOKEN;
const slackUnicoinDcxAppToken = process.env.SLACK_UNICOINDCX_APP_TOKEN;

const slackZebacusBotToken = process.env.SLACK_ZEBACUS_BOT_TOKEN;
const slackZebacusAppToken = process.env.SLACK_ZEBACUS_APP_TOKEN;

const telegramBotTokenUincoindcx = process.env.TELEGRAM_BOT_TOKEN_UNICOINDCX;
const telegramBotTokenZebacus = process.env.TELEGRAM_BOT_TOKEN_ZEBACUS;
const telegramBotTokenStaging = process.env.TELEGRAM_BOT_TOKEN_STAGING;

const telegramBotChatId = process.env.TELEGRAM_BOT_CHAT_ID;
const telegramGroupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;

const slackStagingChannelUrl = process.env.SLACK_STAGING_CHANNEL_URL;
const slackStagingChannelName = process.env.SLACK_STAGING_CHANNEL_NAME;

const slackUnicoinDcxChannelUrl = process.env.SLACK_UNICOIN_DCX_CHANNEL_URL;
const slackUnicoinDcxChannelName = process.env.SLACK_UNICOIN_DCX_CHANNEL_NAME;

const slackZebacusChannelUrl = process.env.SLACK_ZEBACUS_CHANNEL_URL;
const slackZebacusChannelName = process.env.SLACK_ZEBACUS_CHANNEL_NAME;

const stagingUrl = process.env.STAGING_URL;
const uniCoinDcxUrl = process.env.UNICOIN_DCX_URL;
const zebacusUrl = process.env.ZEBACUS_URL;

const stagingSocketUrl = process.env.STAGING_SOCKET_URL;
const uniCoinDcxSocketUrl = process.env.UNICOIN_DCX_SOCKET_URL;
const zebacusSocketUrl = process.env.ZEBACUS_SOCKET_URL;

const stagingSymbolsApi = process.env.STAGING_SYMBOLS_API;
const unicoinDcxSymbolsApi = process.env.UNICOIN_DCX_SYMBOLS_API;
const zebacusSymbolsApi = process.env.ZEBACUS_SYMOLS_API;

const stagingLogo = process.env.STAGING_LOGO;
const unicoinDcxLogo = process.env.UNICOIN_DCX_LOGO;
const zebacusLogo = process.env.ZEBACUS_LOGO;

function getTelegramBotToken() {
  if (feeder === "unicoindcx") {
    return telegramBotTokenUincoindcx;
  } else if (feeder === "zebacus") {
    return telegramBotTokenZebacus;
  } else {
    return telegramBotTokenStaging;
  }
}

export {
  feeder,
  messageApp,
  setIntervalSeconds,
  socketIntervalSeconds,
  socketCandleStickSeconds,
  activeSocketsIntervalSeconds,
  getTelegramBotToken,
  telegramBotChatId,
  telegramGroupChatId,
  slackStagingBotToken,
  slackStagingAppToken,
  slackUnicoinDcxBotToken,
  slackUnicoinDcxAppToken,
  slackZebacusBotToken,
  slackZebacusAppToken,
  slackStagingChannelUrl,
  slackStagingChannelName,
  slackUnicoinDcxChannelUrl,
  slackUnicoinDcxChannelName,
  slackZebacusChannelUrl,
  slackZebacusChannelName,
  stagingUrl,
  uniCoinDcxUrl,
  zebacusUrl,
  stagingSocketUrl,
  uniCoinDcxSocketUrl,
  zebacusSocketUrl,
  stagingSymbolsApi,
  unicoinDcxSymbolsApi,
  zebacusSymbolsApi,
  stagingLogo,
  unicoinDcxLogo,
  zebacusLogo,
};
