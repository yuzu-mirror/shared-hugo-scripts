require("checkenv").check();
const logger = require("fancy-log");
const Twitter = require("twitter");
const fs = require("fs-extra");

const outputDirectory = "../../../site/content/entry";

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url/22648406#22648406
/** @param {string} str */
function isURL(str) {
  const urlRegex =
    "^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$";
  const url = new RegExp(urlRegex, "i");
  return str.length < 2083 && url.test(str);
}

async function run() {
  logger.info(
    `Getting user timeline information for ${process.env.TWITTER_SCREEN_NAME}.`
  );
  let tweets = await client
    .get("statuses/user_timeline", {
      screen_name: process.env.TWITTER_SCREEN_NAME,
    })
    .then((tweets) => {
      return tweets
        .slice(0, process.env.TWITTER_TIMELINE_COUNT + 1 || 50 + 1)
        .map((x, index) => {
          return {
            id: x.id_str,
            date: new Date(x.created_at),
            author: x.user.screen_name,
            message: x.text,
          };
        });
    });

  logger.info(`Got ${tweets.length} tweets from the Twitter API.`);
  // Write each tweet as entry content.
  return tweets.forEach(async (x) => {
    if (isURL(x.message)) {
      logger.warn(
        `Skipping frontmatter generation for tweet ${x.id} -- just a URL.`
      );
      return;
    }

    let tweetRef = `tweet_${x.id}`;
    let frontmatterPath = `${outputDirectory}/${tweetRef}/index.md`;
    let frontmatterContents = `+++
date = "${x.date.toISOString()}"
title = "Tweet ${x.id} by ${x.author}"
twitter = true
twitterId = ${x.id}
twitterUrl = "https://twitter.com/${x.author}/status/${x.id}"
+++

${x.message}`;
    await fs.outputFile(frontmatterPath, frontmatterContents);
    logger.info(`Wrote '${frontmatterPath}' to filesystem.`);
  });
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
