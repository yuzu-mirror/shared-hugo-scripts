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
	return tweets.map((x, index) => {
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

const tweets = [
	{
		id: '817201197065109505',
		order: 1,
		date: '01/05/2017',
		author: 'citraemu',
		image: 'https://pbs.twimg.com/profile_images/699782793736359936/eMLbnRNR_normal.png',
		message: 'Citra nightlies are back up and better than ever! Sorry for the delay and Happy New Year!'
	},
	{
		id: '776626520110399488',
		order: 2,
		date: '09/15/2016',
		author: 'citraemu',
		image: 'https://pbs.twimg.com/profile_images/699782793736359936/eMLbnRNR_normal.png',
		message: 'After much anticipation, Citra now has a JIT! Props again to @MerryMage for another massive contribution to the project!!'
	},
	{
		id: '733831257398747137',
		order: 3,
		date: '05/20/2016',
		author: 'citraemu',
		image: 'https://pbs.twimg.com/profile_images/699782793736359936/eMLbnRNR_normal.png',
		message: 'Props to @MerryMage for a fantastic job on Citra\'s audio support https://t.co/Z23AWxcDkf'
	}
];
