import axios from "axios";

// eslint-disable-next-line import/no-unresolved
import { token } from "./token";
import { rule } from "./transfer-rule";

const express = require("express");
const app = express();
const FormData = require("form-data");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/", async (request: any, response: any) => {
  response.end();

  const requestBody = request.body;
  const event_user = requestBody.event.user;
  const item_user = requestBody.event.item_user;
  const reaction = requestBody.event.reaction;

  if (!(event_user in rule)) {
    return;
  }

  // botの場合、item_userがundefinedになる
  if (item_user !== event_user && item_user != null) {
    return;
  }

  if (requestBody.event.item.type !== "message") {
    return;
  }

  if (requestBody.event.type !== "reaction_added") {
    return;
  }

  const target_channel: string = requestBody.event.item.channel;
  const target_ts: string = requestBody.event.item.ts;
  const latestTs = `${target_ts.split(".")[0]}.${Number.parseInt(target_ts.split(".")[1]) + 1}`;
  const oldestTs = `${target_ts.split(".")[0]}.${Number.parseInt(target_ts.split(".")[1]) - 1}`;

  const target_message = await axios.get("https://slack.com/api/conversations.history", {
    headers: {
      Authorization: `Bearer ${token.slack.user}`,
      "Content-Type": "application/json",
    },
    params: {
      channel: target_channel,
      latest: latestTs,
      oldest: oldestTs,
    },
  });

  const target_channel_info = await axios.get("https://slack.com/api/conversations.info", {
    headers: {
      Authorization: `Bearer ${token.slack.bot}`,
      "Content-Type": "application/json",
    },
    params: {
      channel: target_channel,
    },
  });

  const ts__date = new Date(Number.parseInt(target_ts.split(".")[0]) * 1000);
  const ts__date_formatted = `${ts__date.getFullYear()}/${ts__date.getMonth() + 1}/${ts__date.getDate()} ${ts__date
    .getHours()
    .toString()
    .padStart(2, "0")}:${ts__date.getMinutes().toString().padStart(2, "0")}:${ts__date
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;

  // 転送取り消し
  // (転送先チャンネルの場合)
  if (Object.values(rule).includes(requestBody.event.item.channel)) {
    if (reaction !== "cancel-transfer") {
      return;
    }

    await axios.post(
      "https://slack.com/api/chat.delete",
      {
        channel: `${rule[event_user]}`,
        ts: requestBody.event.item.ts,
      },
      {
        headers: {
          Authorization: `Bearer ${token.slack.bot}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // 転送
  // (それ以外)
  if (reaction !== "transfer") {
    return;
  }

  const target_user_info = await axios.get("https://slack.com/api/users.info", {
    headers: {
      Authorization: `Bearer ${token.slack.bot}`,
      "Content-Type": "application/json",
    },
    params: {
      user: event_user,
    },
  });

  if (target_message.data.ok && target_channel_info.data.ok && target_user_info.data.ok) {
    const profile = target_user_info.data.user.profile;
    const icon_url: string =
      profile.image_original ??
      profile.image_512 ??
      profile.image_192 ??
      profile.image_72 ??
      profile.image_48 ??
      profile.image_32 ??
      profile.image_24 ??
      "";
    const user_name = target_user_info.data.user.name;

    let files: string[] = [];

    if (target_message.data.messages[0].files != null) {
      const images_data = await Promise.all(
        target_message.data.messages[0].files
          .filter((x: any) => /image\/.*/.test(x.mimetype))
          .map((x: any) => {
            return axios.get(x.url_private, {
              headers: {
                Authorization: `Bearer ${token.slack.user}`,
              },
              responseType: "arraybuffer",
            });
          })
      );

      const gyazo_urls = await Promise.all(
        images_data.map((x) => {
          const form = new FormData();
          form.append("access_token", token.gyazo);
          form.append("imagedata", x.data, {
            filename: `${target_ts}__kmc-reacji`,
            contentType: "image/png",
          });
          return axios.post("https://upload.gyazo.com/api/upload", form);
        })
      );

      files = [...files, ...gyazo_urls.map((x) => x.data.url)];

      await Promise.all(
        gyazo_urls.map((x) => {
          return axios.post(
            "https://slack.com/api/chat.postMessage",
            {
              channel: "C03EPCHUVS5",
              text: x.data.permalink_url,
            },
            {
              headers: {
                Authorization: `Bearer ${token.slack.bot}`,
                "Content-Type": "application/json",
              },
            }
          );
        })
      );
    }

    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: `${rule[event_user]}`,
        text: `${target_message.data.messages[0].text}`,
        blocks: JSON.stringify([
          {
            type: "context",
            elements: [
              {
                type: "plain_text",
                text: `${target_channel_info.data.channel.name} から転送 / ${ts__date_formatted}`,
                emoji: true,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${target_message.data.messages[0].text}\n${files.join("\n")}`,
            },
          },
        ]),
        icon_url: icon_url,
        username: user_name,
      },
      {
        headers: {
          Authorization: `Bearer ${token.slack.bot}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Request URLの検証時に必要
  // response.end(request.body.challenge);
});

app.listen(12080);
