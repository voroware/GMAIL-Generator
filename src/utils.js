const chalk = require("chalk");
const password = require("secure-random-password");
const lockfile = require("proper-lockfile");
const fs = require("fs/promises");

const log = (message, type) => {
  switch (type) {
    case "info":
      console.log(chalk.blueBright(message));
      break;
    case "error":
      console.log(chalk.redBright(message));
      break;
    case "success":
      console.log(chalk.greenBright(message));
      break;
    case "warn":
      console.log(chalk.yellowBright(message));
      break;
    default:
      console.log(chalk.magenta(message));
  }
};

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const genPw = () => {
  let pw = password.randomPassword({
    characters: [password.lower, password.upper, password.digits],
  });
  pw = pw.slice(0, pw.length - 5);
  let num = rNum(1000, 9999);
  pw = pw + "!" + num.toString();
  pw += "Aa";
  return pw;
};

const rNum = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const pathExists = async (filePath) => {
  try {
    await fs.readFile(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

const writeToFile = async (filePath, content) => {
  const lockOptions = {
    retries: {
      retries: 100, // Number of retries
      factor: 3, // The exponential factor to use
      minTimeout: 1 * 1000, // The number of milliseconds before starting the first retry
      maxTimeout: 60 * 1000, // The maximum number of milliseconds between two retries
      randomize: true, // Randomizes the timeouts by multiplying with a factor between 1 to 2
    },
  };

  let release;
  try {
    let fileExists = await pathExists(filePath);
    if (!fileExists) {
      await fs.writeFile(filePath, ""); // Create an empty file
    }

    // Try to acquire the lock
    release = await lockfile.lock(filePath, lockOptions);
    await fs.appendFile(filePath, `${content}\n`);

    // Release the lock
    await release();
    release = null; // Set to null to avoid double release
  } catch (err) {
    log(`Error adding to file: ${err.message}`, "error");
  } finally {
    if (release) {
      // Make sure to release the lock if it was acquired but an error occurred
      await release();
    }
  }
};

const genNum = () => {
  return Math.floor(Math.random() * 3023);
};

module.exports = {
  log,
  sleep,
  genPw,
  writeToFile,
  genNum,
};
