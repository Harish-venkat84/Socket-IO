import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env.ENV || 'local';

dotenv.config({
  path: path.resolve(__dirname, `.././.env.${env}`),
});
console.log("env =>", env, path.resolve(__dirname, `.././.env.${env}`))

export const feeder = process.env.FEEDER;
export const messageApp = process.env.MESSAGE_APP;

export const setIntervalSeconds = Number(process.env.SETENTERVAL_SECONDS);
export const socketIntervalSeconds = Number(process.env.SOCKET_INTERVAL_SECONDS);
export const socketCandleStickSeconds = Number(process.env.SOCKET_CANDLESTICK_SECONDS);
export const activeSocketsIntervalSeconds = Number(process.env.ACTIVE_SOCKETS_INTERVAL_SECONDS);
export const pm2RestartIntervalSeconds = Number(process.env.PM2_RESTART_INTERVAL_SECONDS);
export const prometheusAlertmanager = process.env.PROMETHEUS_ALERTMANAGER;

export const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
export const telegramBotChatId = process.env.TELEGRAM_BOT_CHAT_ID;
export const telegramGroupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;

export const slackChannelUrl = process.env.SLACK_CHANNEL_URL;
export const slackChannelName = process.env.SLACK_CHANNEL_NAME;

export const slackBotToken = process.env.SLACK_BOT_TOKEN;
export const slackAppToken = process.env.SLACK_APP_TOKEN;

export const traderUrl = process.env.TRADER_URL;
export const socketUrl = process.env.SOCKET_URL;
export const traderSymbolApi = process.env.TRADER_SYMBOLS_API;
export const traderFileView = process.env.TRADER_FILE_VIEW;
export const adminSetting = process.env.ADMIN_SETTING;

export const admin_gateway = process.env.ADMIN_GATEWAY;
export const trader_gateway = process.env.TRADER_GETWAY;
export const crm_gateway = process.env.CRM_GETWAY;
export const exchange_gateway = process.env.EXCHANGE_GETWAY;

export const binanceSymbolsUrl = process.env.BINANCE_SYMBOLS_URL;
export const mexcSymbolsUrl = process.env.MEXC_SYMBOLS_URL;

export const okxApiKey = process.env.OKX_APIKEY;
export const okxSecretKey = process.env.OKX_SECRETKEY;
export const okxPassphrase = process.env.OKX_PASSPHRASE;
export const okxSymbolsUrl = process.env.OKX_SYMBOLS_URL;

export const kucoinSymbolsUrl = process.env.KUCOIN_SYMBOLS_URL;

export const krakenSymbolsUrl = process.env.KRAKEN_SYMBOLS_URL;