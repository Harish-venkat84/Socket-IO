import axios from "axios";
import {
  feeder,
  slackStagingChannelUrl,
  slackStagingChannelName,
  slackUnicoinDcxChannelUrl,
  slackUnicoinDcxChannelName,
  slackZebacusChannelUrl,
  slackZebacusChannelName,
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

export { slackChannel };
