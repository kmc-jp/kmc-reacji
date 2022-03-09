import axios from "axios";

import { token } from "./token";
import { rule } from "./transfer-rule";

const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/", async (request: any, response: any) => {
  const requestBody = request.body;
  const user = requestBody.event.user;
  const item_user = requestBody.event.item_user;
  const reaction = requestBody.event.reaction;

  if (requestBody.event.type !== "reaction_added") {
    response.end();
    return;
  }

  if (!(user in rule)) {
    response.end();
    return;
  }

  if (item_user !== user) {
    response.end();
    return;
  }

  if (requestBody.event.item.type !== "message") {
    response.end();
    return;
  }

  // if (reaction !== "transfer") {
  if (reaction !== "+1") {
    response.end();
    return;
  }

  const channel: string = requestBody.event.item.channel;
  const ts: string = requestBody.event.item.ts;
  const latestTs = `${ts.split(".")[0]}.${Number.parseInt(ts.split(".")[1]) + 1}`;
  const oldestTs = `${ts.split(".")[0]}.${Number.parseInt(ts.split(".")[1]) - 1}`;

  const message_result = await axios.get("https://slack.com/api/conversations.history", {
    headers: {
      Authorization: `Bearer ${token.slack}`,
      "Content-Type": "application/json",
    },
    params: {
      channel: channel,
      latest: latestTs,
      oldest: oldestTs,
    },
  });

  const channel_result = await axios.get("https://slack.com/api/conversations.info", {
    headers: {
      Authorization: `Bearer ${token.slack}`,
      "Content-Type": "application/json",
    },
    params: {
      channel: channel,
    },
  });

  const userinfo_result = await axios.get("https://slack.com/api/users.info", {
    headers: {
      Authorization: `Bearer ${token.slack}`,
      "Content-Type": "application/json",
    },
    params: {
      user: user,
    },
  });

  if (message_result.data.ok && channel_result.data.ok && userinfo_result.data.ok) {
    const profile = userinfo_result.data.user.profile;
    const icon_url: string =
      profile.image_original ??
      profile.image_512 ??
      profile.image_192 ??
      profile.image_72 ??
      profile.image_48 ??
      profile.image_32 ??
      profile.image_24 ??
      "";
    const user_name = userinfo_result.data.user.name;

    const ts_date = new Date(Number.parseInt(ts.split(".")[0]) * 1000);
    const ts_date_formatted = `${ts_date.getFullYear()}/${
      ts_date.getMonth() + 1
    }/${ts_date.getDate()} ${ts_date.getHours()}:${ts_date.getMinutes()}:${ts_date.getSeconds()}`;

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: `${rule[user]}`,
        text: `${message_result.data.messages[0].text}`,
        blocks: JSON.stringify([
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `\`#${channel_result.data.channel.name} から転送\` \`${ts_date_formatted}\`\n${message_result.data.messages[0].text}`,
            },
          },
        ]),
        as_user: true,
        icon_url: icon_url,
        username: user_name,
      },
      {
        headers: {
          Authorization: `Bearer ${token.slack}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  response.end();

  // Request URLの検証時に必要
  // response.end(request.body.challenge);
});

app.listen(12080);
