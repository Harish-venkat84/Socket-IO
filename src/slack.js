import axios from "axios";
import {
  feeder,
  slackStagingChannelUrl,
  slackStagingChannelName,
  slackUnicoinDcxChannelUrl,
  slackUnicoinDcxChannelName,
  slackZebacusChannelUrl,
  slackZebacusChannelName,
  prometheusAlertmanager,
} from "./index.js";

const slackData = {
  slackChannelUrl: `${feeder === "staging" ? slackStagingChannelUrl : feeder === "unicoindcx" ? slackUnicoinDcxChannelUrl : slackZebacusChannelUrl}`,
  slackChannelName: `${
    feeder === "staging" ? slackStagingChannelName : feeder === "unicoindcx" ? slackUnicoinDcxChannelName : slackZebacusChannelName
  }`,
};

function slackChannel(message) {
  axios
    .post(slackData.slackChannelUrl, {
      channel: slackData.slackChannelName,
      text: message,
    })
    .then((res) => {})
    .catch((err) => {
      console.log(err);
    });
}

function alertManager() {
  const alert = [
    {
      labels: {
        alertname: "restarting_pm2_feeder",
        severity: "critical",
        environment: "production",
      },
      annotations: {
        summary: "stating feeder down alert",
        description: "stating feeder down alert",
        runbook: "stating feeder down alert",
      },
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
  ];

  axios
    .post(prometheusAlertmanager, alert, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => console.log("✅ Alert sent:", res.status))
    .catch((err) => {
      console.error("❌ Error sending alert:", err.message);
      if (err.response) {
        console.error("Status Code:", err.response.status);
        console.error("Response Body:", err.response.data);
      }
    });
}

export { slackChannel, alertManager };
