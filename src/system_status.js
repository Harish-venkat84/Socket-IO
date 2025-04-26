import axios from "axios";
import { admin_gateway, crm_gateway, trader_gateway, exchange_gateway } from "./index.js";

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

const alert_status = new Map();
let initial_alert_message = false;

for (const value of micro_services) {
  alert_status.set(value.gateway_microservice, false);
}

async function get_system_status(gateway_micro) {
  try {
    const { data } = await axios.get(gateway_micro.url);
    if (data?.statusCode === 200 && alert_status.get(gateway_micro.gateway_microservice)) {
      console.log({ gateway_microservice: gateway_micro.gateway_microservice, statusCode: data.statusCode });
    } else if (data?.statusCode === 200 && !alert_status.get(gateway_micro.gateway_microservice)) {
      if (initial_alert_message) {
        console.log({ gateway_microservice: gateway_micro.gateway_microservice, statusCode: data.statusCode });
      }
      alert_status.set(gateway_micro.gateway_microservice, true);
    }
  } catch (err) {
    if (err?.response?.data?.statusCode === 500) {
      console.log(`**Alert ${gateway_micro.gateway_microservice} down!`);
      alert_status.set(gateway_micro.gateway_microservice, false);
    } else {
      console.error("Error fetching", { gateway_microservice: gateway_micro.gateway_microservice }, err?.response?.data);
    }
  }
}

export default async function validate_gateway_microservice_status() {
  for (const value of micro_services) {
    await get_system_status(value);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  initial_alert_message = true;
}

setInterval(async () => {
  await validate_gateway_microservice_status();
}, 20000);
