async function recaptchaV3({ domain, siteKey, action }, page) {

    if (!domain)
        throw new Error("Missing domain parameter");

    if (!siteKey)
        throw new Error("Missing siteKey parameter");

    await page.setBypassCSP(true);
    await page.setCacheEnabled(true);

    await page.goto(domain, {
        waitUntil: "domcontentloaded",
        timeout: 30000
    });

    const hasRecaptcha = await page.evaluate(() => !!window.grecaptcha);

    if (!hasRecaptcha) {

        await page.addScriptTag({
            url: `https://www.google.com/recaptcha/api.js?render=${siteKey}`
        });

        await page.waitForFunction(() => window.grecaptcha, {
            timeout: 10000
        });

    }

    const token = await page.evaluate(async (siteKey, action) => {

        await new Promise(resolve => grecaptcha.ready(resolve));

        return grecaptcha.execute(siteKey, {
            action: action || "homepage"
        });

    }, siteKey, action);

    if (!token)
        throw new Error("Failed to get token");

    return {
        success: true,
        type: "recaptcha3",
        token
    };

}

module.exports = recaptchaV3;
