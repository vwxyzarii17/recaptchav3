const express = require("express");
const { connect } = require("puppeteer-real-browser");

const recaptchaV3 = require("./Api/recaptcha3");

const app = express();
const port = process.env.PORT || 7860;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({
        message: "reCAPTCHA v3 Solver",
        version: "1.0.0"
    });
});

app.post("/solve", async (req, res) => {

    const { domain, siteKey, action } = req.body;

    if (!domain)
        return res.status(400).json({
            success: false,
            message: "Missing domain"
        });

    if (!siteKey)
        return res.status(400).json({
            success: false,
            message: "Missing siteKey"
        });

    let browser;

    try {

        const ctx = await init_browser();
        browser = ctx.browser;

        const result = await recaptchaV3({
            domain,
            siteKey,
            action
        }, ctx.page);

        await browser.close();

        res.json(result);

    } catch (err) {

        if (browser) {
            try {
                await browser.close();
            } catch {}
        }

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

async function init_browser() {

    const { browser } = await connect({
        headless: false,
        turnstile: true,
        connectOption: {
            defaultViewport: null
        },
        disableXvfb: false
    });

    const [page] = await browser.pages();

    await page.goto("about:blank");

    await page.setRequestInterception(true);

    page.on("request", request => {

        const type = request.resourceType();

        if (["image", "stylesheet", "font", "media"].includes(type))
            request.abort();
        else
            request.continue();

    });

    return {
        browser,
        page
    };

}

app.listen(port, () => {
    console.log(`Server running : http://localhost:${port}`);
});
