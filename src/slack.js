import axios from "axios";
import { slackChannelUrl, slackChannelName, prometheusAlertmanager } from "./index.js";

export function slackChannel(message) {
  axios
    .post(slackChannelUrl, {
      channel: slackChannelName,
      text: message,
    })
    .then((res) => {})
    .catch((err) => {
      console.log(err);
    });
}

export function alertManager() {
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