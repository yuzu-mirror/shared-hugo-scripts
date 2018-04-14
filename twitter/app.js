require('checkenv').check();

const logger = require('winston')
const Twitter = require('twitter')
const dateFormat = require('dateformat')
const fs = require('fs-extra')

const outputDirectory = '../../../site/content/entry'

const client = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const run = async () => {
	console.info(`Getting user timeline information for ${process.env.TWITTER_SCREEN_NAME}.`)
	let tweets = await client.get('statuses/user_timeline', {screen_name: process.env.TWITTER_SCREEN_NAME}).then(tweets => {
		return tweets.slice(0, process.env.TWITTER_TIMELINE_COUNT + 1 || 5 + 1).map((x, index) => {
			return {
				id: x.id_str,
				date: dateFormat(x.created_at, 'mmmm d, yyyy'),
				author: x.user.screen_name,
				message: x.text
			}
		})
	})

	console.info(`Got ${tweets.length} tweets from the Twitter API.`)
	// Write each tweet as entry content.
	return tweets.forEach(async (x) => {
		let tweetRef = `tweet_${x.id}`
		let frontmatterPath = `${outputDirectory}/${tweetRef}/index.md`
		let frontmatterContents = `+++
date = "${x.date}"
title = "Tweet ${x.id} by ${x.author}"
twitter = true
twitterId = ${x.id}
twitterUrl = "https://twitter.com/${x.author}/status/${x.id}"
+++

${x.message}`
		await fs.outputFile(frontmatterPath, frontmatterContents)
		logger.info(`Wrote '${frontmatterPath}' to filesystem.`)
	})
}

run().catch(err => {
	logger.error(err);
	process.exit(1);
});
