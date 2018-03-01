require('checkenv').check();

const logger = require('winston');
const Twitter = require('twitter');
const dateFormat = require('dateformat');
const jsonfile = require('jsonfile');

const outputFile = '../../../site/data/twitter.json';

const client = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

client.get('statuses/user_timeline', {screen_name: process.env.TWITTER_SCREEN_NAME}).then(tweets => {
	return tweets.slice(0, process.env.TWITTER_TIMELINE_COUNT + 1 || 5 + 1).map((x, index) => {
		return {
			id: x.id_str,
			order: index,
			date: dateFormat(x.created_at, 'mmmm d, yyyy'),
			author: x.user.screen_name,
			image: x.profile_image_url_https,
			message: x.text
		};
	});
}).catch(err => {
	logger.error(err);
	process.exit(1);
}).then(tweets => {
	// Write the tweets to a Hugo JSON data file.
	jsonfile.writeFile(outputFile, tweets, err => {
		if (err) {
			return Promise.reject(err);
		}

		logger.info(`Wrote ${tweets.length} tweets to ${outputFile}`);
	});
});
