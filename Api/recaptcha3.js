async function recaptchaV3({ domain, siteKey, action }, page) {

    if (!domain)
        throw new Error("Missing domain parameter");

    if (!siteKey)
        throw new Error("Missing siteKey parameter");

    const timeout = 120000;

    return new Promise(async (resolve, reject) => {

        let finished = false;

        const timer = setTimeout(() => {

            if (!finished) {
                finished = true;
                reject(new Error("Timeout Error"));
            }

        }, timeout);

        try {

            await page.goto(domain, {
                waitUntil: "domcontentloaded"
            });

            await page.addScriptTag({
                url: `https://www.google.com/recaptcha/api.js?render=${siteKey}`
            });

            const token = await page.evaluate(async (siteKey, action) => {

                await new Promise(resolve => grecaptcha.ready(resolve));

                return grecaptcha.execute(siteKey, {
                    action: action || "login"
                });

            }, siteKey, action);

            clearTimeout(timer);

            if (!token || token.length < 10)
                throw new Error("Failed to get token");

            finished = true;

            resolve({
                success: true,
                type: "recaptcha3",
                token
            });

        } catch (err) {

            clearTimeout(timer);

            if (!finished) {
                finished = true;
                reject(err);
            }

        }

    });

}

module.exports = recaptchaV3;
