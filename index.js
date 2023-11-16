const gmailModule = require("./src/gen");
const { amount, sms, headless } = require("./config.json");

(async () => {
  const tasks = Array.from({ length: amount }, () =>
    new gmailModule(sms, headless).run()
  );
  await Promise.allSettled(tasks);
})();
