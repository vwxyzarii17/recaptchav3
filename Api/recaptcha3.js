async function recaptchaV3({ domain, siteKey, action = "login" }, page) {

    if (!domain)
        throw new Error("Missing domain parameter");

    if (!siteKey)
        throw new Error("Missing siteKey parameter");

    const timeout = global.timeOut || 120000;

    await page.goto(domain, {
        waitUntil: "domcontentloaded"
    });

    await page.addScriptTag({
        url: `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    });

    const token = await Promise.race([

        page.evaluate(async (siteKey, action) => {

            await new Promise(resolve => grecaptcha.ready(resolve));

            return grecaptcha.execute(siteKey, {
                action
            });

        }, siteKey, action),

        new Promise((_, reject) => {

            setTimeout(() => {
                reject(new Error("Timeout Error"));
            }, timeout);

        })

    ]);

    if (!token || typeof token !== "string" || token.length < 10)
        throw new Error("Failed to get token");

    return {
        success: true,
        type: "recaptcha3",
        token
    };

}

module.exports = recaptchaV3;
