const express = require("express");
const { connect } = require("puppeteer-real-browser");

const recaptchaV3 = require("./Api/recaptcha3");

const app = express();
const port = process.env.PORT || 7860;

global.timeOut = Number(process.env.timeOut) || 60000;

/* ================= SINGLE BROWSER ================= */

let browser;
let browserReady = false;
let restarting = false;

/* ================= INIT ================= */

async function initBrowser() {

    console.log("Starting browser...");

    const { browser: br } = await connect({
        headless: false,
        turnstile: true,
        connectOption: {
            defaultViewport: null
        },
        disableXvfb: false
    });

    browser = br;
    browserReady = true;

    console.log("Browser ready");

    browser.on("disconnected", async () => {

        console.log("Browser disconnected");

        browserReady = false;

        if (restarting) return;

        restarting = true;

        setTimeout(async () => {

            try {

                console.log("Restarting browser...");

                await initBrowser();

            } catch (err) {

                console.error(err);

            }

            restarting = false;

        }, 5000);

    });

}

/* ================= MONITOR ================= */

setInterval(async () => {

    if (!browser || !browser.isConnected()) {

        if (restarting) return;

        restarting = true;
        browserReady = false;

        console.log("Browser not connected. Restarting...");

        try {

            await initBrowser();

        } catch (err) {

            console.error(err);

        }

        restarting = false;

    }

}, 30000);

/* ================= CREATE PAGE ================= */

async function createPage() {

    const page = await browser.newPage();

    await page.goto("about:blank");

    await page.setRequestInterception(true);

    page.on("request", request => {

        const type = request.resourceType();

        if (
            type === "image" ||
            type === "stylesheet" ||
            type === "font" ||
            type === "media"
        ) {

            request.abort();

        } else {

            request.continue();

        }

    });

    return page;

}

/* ================= EXPRESS ================= */

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

/* ================= HEALTH ================= */

app.get("/", (req, res) => {

    res.json({
        message: "reCAPTCHA v3 Solver",
        version: "1.0.0",
        browser: browserReady
    });

});

/* ================= SOLVE ================= */

app.post("/solve", async (req, res) => {

    if (!browserReady) {

        return res.status(503).json({
            success: false,
            message: "Browser not ready"
        });

    }

    const {
        domain,
        siteKey,
        action
    } = req.body;

    if (!domain) {

        return res.status(400).json({
            success: false,
            message: "Missing domain"
        });

    }

    if (!siteKey) {

        return res.status(400).json({
            success: false,
            message: "Missing siteKey"
        });

    }

    let page;
    const start = Date.now();

    try {

        page = await createPage();

        const result = await Promise.race([

            recaptchaV3({
                domain,
                siteKey,
                action
            }, page),

            new Promise((_, reject) => {

                setTimeout(() => {

                    reject(new Error("Solve timeout"));

                }, global.timeOut);

            })

        ]);

                const solveTime = ((Date.now() - start) / 1000).toFixed(2);

        try {

            await page.close();

        } catch {}

        return res.json({
            ...result,
            solveTime: `${solveTime} s`
        });

    } catch (err) {

        const solveTime = ((Date.now() - start) / 1000).toFixed(2);

        if (page) {

            try {

                await page.close();

            } catch {}

        }

        return res.status(500).json({
            success: false,
            message: err.message,
            solveTime: `${solveTime} s`
        });

    

    }

});

/* ================= START ================= */

(async () => {

    try {

        await initBrowser();

        app.listen(port, () => {

            console.log(`Server running : http://localhost:${port}`);

        });

    } catch (err) {

        console.error("Failed to start browser:", err);

        process.exit(1);

    }

})();

/* ================= ERROR HANDLER ================= */

process.on("unhandledRejection", err => {

    console.error("Unhandled Rejection:", err);

});

process.on("uncaughtException", err => {

    console.error("Uncaught Exception:", err);

});
