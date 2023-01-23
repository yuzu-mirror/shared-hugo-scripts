require("checkenv").check();

const util = require("util");
const logger = require("fancy-log");

const sanitizeHtml = require("sanitize-html");
const fs = require("fs-extra");
const execa = import("execa");

const inputDirectory = "./wiki/";
const outputDirectory = "../../../site/content/wiki/";

/** Generate URL for the given title name
 * @param {string} title
 */
function url(title) {
  return "/wiki/" + title.replace(/\s+/g, "-").toLowerCase();
}

async function run() {
  if (fs.existsSync(inputDirectory)) {
    logger.info(`Purging input directory: ${inputDirectory}`);
    fs.removeSync(inputDirectory);
  }

  const exec = (await execa).execaSync;
  logger.info(`git clone ${process.env.GITHUB_WIKI_URL} wiki`);
  exec("git", ["clone", process.env.GITHUB_WIKI_URL, "wiki"]);

  if (!fs.existsSync(outputDirectory)) {
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
      items
        .filter((file) => file.endsWith(".md"))
        .forEach((item) => {
          // Generate the title from the filename.
          generateEntry(item);
        });
    } catch (err) {
      logger.error(err);
    }
  });
}

/** Generate one wiki entry
 * @param {string} item */
function generateEntry(item) {
  const title = item.replace(/-/g, " ").slice(0, -3);
  const stats = fs.statSync(`${inputDirectory}${item}`);
  const modified = new Date(util.inspect(stats.mtime));

  // Read the .md file.
  fs.readFile(`${inputDirectory}${item}`, "utf8", (err, data) => {
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
          if (i > lines.length) return;
          if (i === 0 || lines[i] === "\n") continue;

          // Search for the start of a list designated by the * character.
          if (
            lines[i].startsWith("* ") &&
            lines[i - 1].startsWith("* ") === false
          ) {
            i++;
            lines.splice(i - 1, 0, "");
          }
        }
        cleanData = lines.join("\n");
      } catch (err) {
        logger.error(err);
      }

      // Replacing tags like [[Common Issues on Windows|Common Issues]]
      cleanData = cleanData.replace(
        /\[\[(.*)\|(.*)\]\]/g,
        (_, p1, p2) => `[${p1}](${url(p2)})`
      );

      // Replacing tags like [[Common Issues]]
      cleanData = cleanData.replace(
        /\[\[(.*)\]\]/g,
        (_, p1) => `[${p1}](${url(p1)})`
      );

      // Restore some escaped entities
      cleanData = cleanData
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      // Create the new markdown header for Hugo.
      const newFileContents = `+++\r\ntitle = "${title}"\r\ndate = "${modified.toISOString()}"\r\n+++\r\n\r\n${cleanData}\r\n`;

      const itemOutput = item.toLowerCase();
      fs.writeFile(
        `${outputDirectory}${itemOutput}`,
        newFileContents,
        (err) => {
          if (err) {
            return logger.error(err);
          }
          logger.info(`Wrote file ${itemOutput} to filesystem.`);
        }
      );
    } catch (err) {
      logger.error(err);
    }
  });
}

run().catch((e) => logger.error(e));
