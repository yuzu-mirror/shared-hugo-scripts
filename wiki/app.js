require('checkenv').check();

const util = require('util');
const logger = require('winston');

const sanitizeHtml = require('sanitize-html');
const fs = require('fs-extra');
const exec = require('sync-exec');

const inputDirectory = './wiki/';
const outputDirectory = '../../../site/content/wiki/';

// The URL
function url(title) {
	return '/wiki/' + title.replace(/\s+/g, '-').toLowerCase();
}

if (fs.existsSync(inputDirectory)) {
	logger.info(`Purging input directory: ${inputDirectory}`);
	fs.removeSync(inputDirectory);
}

const gitCloneCommand = `git clone ${process.env.GITHUB_WIKI_URL} wiki`;
logger.info(`exec ${gitCloneCommand}`);
exec(gitCloneCommand);

if (fs.existsSync(outputDirectory) === false) {
	logger.info(`Creating missing output directory: ${outputDirectory}`);
	fs.mkdirSync(outputDirectory);
}

fs.readdir(inputDirectory, (err, items) => {
	if (err) {
		logger.error(err);
		return;
	}

	try {
        // Look for all .md files within the wiki directory.
		items.filter(file => file.substr(-3) === '.md').forEach(item => {
            // Generate the title from the filename.
			const title = item.replace(/-/g, ' ').slice(0, -3);
			const stats = fs.statSync(`${inputDirectory}${item}`);
			const modified = new Date(util.inspect(stats.mtime));

            // Read the .md file.
			fs.readFile(`${inputDirectory}${item}`, 'utf8', (err, data) => {
				if (err) {
					logger.error(err);
					return;
				}

				try {
                    // Convert various data inside of the markdown language.
					let cleanData = sanitizeHtml(data);

                    // Blackfriday Markdown Rendering requires a blank line before lists.
					try {
						const lines = cleanData.split(/\r?\n/);
						for (let i = 0; i < lines.length; i++) {
                            // If it's the start of the file, ignore to prevent an index issue.
							if (i > lines.length) {
								return;
							}
							if (i === 0 || lines[i] === '\n') {
								continue;
							}

                            // Search for the start of a list designated by the * character.
							if (lines[i].startsWith('* ') && lines[i - 1].startsWith('* ') === false) {
								i += 1;
								lines.splice(i - 1, 0, '');
							}
						}
						cleanData = lines.join('\n');
					} catch (err) {
						logger.error(err);
					}

                    // Replacing tags like [[Common Issues on Windows|Common Issues]]
					cleanData = cleanData.replace(/\[\[(.*)\|(.*)\]\]/g, (match, p1, p2) => {
						return `[${p1}](${url(p2)})`;
					});

                    // Replacing tags like [[Common Issues]]
					cleanData = cleanData.replace(/\[\[(.*)\]\]/g, (match, p1) => {
						return `[${p1}](${url(p1)})`;
					});

                    // Create the new markdown header for Hugo.
					const newFileContents = `+++\r\ntitle = "${title}"\r\ndate = "${modified.toISOString()}"\r\n+++\r\n\r\n${cleanData}\r\n`;

					const itemOutput = item.toLowerCase();
					fs.writeFile(`${outputDirectory}${itemOutput}`, newFileContents, err => {
						if (err) {
							return logger.error(err);
						}
						logger.info(`Wrote file ${itemOutput} to filesystem.`);
					});
				} catch (err) {
					logger.error(err);
				}
			});
		});
	} catch (err) {
		logger.error(err);
	}
});
