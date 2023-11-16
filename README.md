<h3 align="center">
  Made by <a href="https://github.com/voromade">voromade</a>
</h3>

<h1 align="center">🔵 Voro GMAIL Generator 🔵</h1>

<p align="center">
  Seamlessly generate GMAIL accounts & auto-verify the accounts using [5sim](https://5sim.net/)
</p>

## Features:

- GMAIL Account Generator (Using Puppeteer)
- Account Exporting (to exports.txt)
- [5sim](https://5sim.net/) for SMS Verification
- [Faker](https://www.npmjs.com/package/faker/v/5.5.3) (large dataset of fake data)

## Configuration:

Amount = Amount of accounts to generate (tasks are run concurrently)
Headless = Headless or headful

true = headless
false = headful
"new" = Uses latest headless browser (decreases detection)

SMS:
Region = 5sim region to use
apiKey = 5SIM API Key

```
{
    "amount": 1,
    "headless": "new",
    "sms": {
        "region": "",
        "apiKey": ""
    }
}
```

## Todo:

- [ ] 10 Stars: Proxy Support
- [ ] 25 Stars: Python Version
