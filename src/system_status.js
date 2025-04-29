import axios from "axios";
import { slackChannel } from "./slack.js";
import {
  feeder,
  admin_gateway,
  crm_gateway,
  trader_gateway,
  exchange_gateway,
  slackSystemStatusChannelName,
  slackSystemStatusChannelUrl,
} from "./index.js";

const micro_services = [
  {
    url: `${trader_gateway}/health`,
    gateway_microservice: "Trader gateway",
  },
  {
    url: `${admin_gateway}/health`,
    gateway_microservice: "Admin gateway",
  },
  {
    url: `${crm_gateway}/health`,
    gateway_microservice: "CRM gateway",
  },
  {
    url: `${exchange_gateway}/health`,
    gateway_microservice: "Exchange gateway",
  },
  {
    url: `${exchange_gateway}/spot/health`,
    gateway_microservice: "Spot Microservice",
  },
  {
    url: `${exchange_gateway}/fifo/health`,
    gateway_microservice: "Fifo Microservice",
  },
  {
    url: `${exchange_gateway}/trader_user/health`,
    gateway_microservice: "Trader user Microservice",
  },
  {
    url: `${exchange_gateway}/event/health`,
    gateway_microservice: "Event Microservice",
  },
  {
    url: `${exchange_gateway}/candlestick/health`,
    gateway_microservice: "Candlestick Microservice",
  },
  {
    url: `${exchange_gateway}/export/health`,
    gateway_microservice: "Export Microservice",
  },
  {
    url: `${exchange_gateway}/integration/health`,
    gateway_microservice: "Integration Microservice",
  },
  {
    url: `${exchange_gateway}/wallet/health`,
    gateway_microservice: "Wallet Microservice",
  },
  {
    url: `${exchange_gateway}/exchange/health`,
    gateway_microservice: "Exchange Microservice",
  },
  {
    url: `${exchange_gateway}/notification/health`,
    gateway_microservice: "Notification Microservice",
  },
  {
    url: `${exchange_gateway}/admin_iam/health`,
    gateway_microservice: "Admin Microservice",
  },
  {
    url: `${exchange_gateway}/crm_iam/health`,
    gateway_microservice: "CRM Microservice",
  },
  {
    url: `${exchange_gateway}/cron/health`,
    gateway_microservice: "Cron Microservice",
  },
  {
    url: `${exchange_gateway}/campaign/health`,
    gateway_microservice: "Campaign Microservice",
  },
];

let exchange = feeder === "staging" ? "PIX-Staging" : feeder === "unicoindcx" ? "UniCoinDCX" : "zebacus";
let system_status = false;
const alert_status = new Map();

for (const value of micro_services) {
  alert_status.set(value.gateway_microservice, true);
}

async function get_system_status(gateway_micro, slackType, say) {
  const channelUrl = slackSystemStatusChannelUrl;
  const channelName = slackSystemStatusChannelName;
  try {
    const { data } = await axios.get(gateway_micro.url);
    if (data?.statusCode === 200 && !alert_status.get(gateway_micro.gateway_microservice)) {
      const message = `✅ ${exchange} - ${gateway_micro.gateway_microservice} issue resolved\n
      status code: ${data.statusCode}`;
      if (slackType === "channel") {
        await slackChannel(message, channelUrl, channelName);
      } else if (slackType === "bot") {
        await say(message);
      }
      alert_status.set(gateway_micro.gateway_microservice, true);
    }
  } catch (err) {
    if (err?.response?.data?.statusCode === 500) {
      const error_message = `❌ ${exchange} - *${gateway_micro.gateway_microservice}* down!\n
      status code: ${err?.response?.data?.statusCode}\n
      message: ${err?.response?.data?.message}`;
      if (slackType === "channel") {
        await slackChannel(error_message, channelUrl, channelName);
      } else if (slackType === "bot") {
        await say(error_message);
        system_status = true;
      }
      alert_status.set(gateway_micro.gateway_microservice, false);
    } else {
      if (slackType === "channel") {
        await slackChannel(`Error fetching: ${gateway_micro.gateway_microservice}`, channelUrl, channelName);
      } else if (slackType === "bot") {
        await say(`Error fetching: ${gateway_micro.gateway_microservice}`);
        system_status = true;
      } else {
        console.log(`Error fetching: ${gateway_micro.gateway_microservice}`, channelUrl, channelName);
      }
      alert_status.set(gateway_micro.gateway_microservice, false);
    }
  }
}

export default async function validate_gateway_microservice_status(slackType = "channel", say) {
  if (slackType === "bot") {
    await say("please wait it may take sometime....");
  }
  for (const value of micro_services) {
    await get_system_status(value, slackType, say);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (slackType === "bot" && !system_status) {
    await say(`✅ ${exchange} - Gateway & Microservice are working fine`);
  }
  system_status = false;
}
