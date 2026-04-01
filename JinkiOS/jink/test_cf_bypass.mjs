import puppeteer from 'puppeteer';

(async () => {
    // We are simulating what the Cloudflare Browser Rendering Worker might do
    // to test if we can even load the target page without hitting a Cloudflare 403.
    console.log("Launching headless browser...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Set a normal user agent to try and pass basic bot checks if not using CF Broker
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Instead of querying the collectionguides site, we query the preservica domain directly using the borough folder
    // collection SO_975f712b-36ad-47b7-9cbe-cc3903b25a28 is Manhattan (1)
    const targetUrl = `https://nycrecords.access.preservica.com/uncategorized/SO_975f712b-36ad-47b7-9cbe-cc3903b25a28/`;
    
    console.log(`Navigating to: ${targetUrl}`);
    
    try {
        const response = await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        console.log(`Status Code: ${response.status()}`);
        const content = await page.content();
        
        if (content.includes("Just a moment...") || content.includes("Cloudflare")) {
            console.log("❌ BLOCKED: Hit Cloudflare Turnstile/Captcha.");
            return;
        } 
        
        console.log("✅ SUCCESS: Page loaded without Cloudflare block!");
        
        // The preservica directory contains grid pages of IO_ entities
        const ioLink = await page.$eval('a[href*="/IO_"]', el => el.href).catch(() => null);
        
        if (!ioLink) {
            console.log("❌ Could not find IO link. Dumping DOM...");
            const bodyHTML = await page.evaluate(() => document.body.innerHTML);
            console.log(bodyHTML.substring(0, 1500)); // Print a chunk of the DOM
            return;
        }
        
        console.log(`Found Entity URL: ${ioLink}`);
            
        // Navigate to the entity page
        console.log("Navigating to entity page...");
        await page.goto(ioLink, { waitUntil: 'networkidle2' });
        
        let imageUrl = null;
        // Listen to network requests for the render token
        page.on('request', request => {
            const url = request.url();
            if (url.includes('Render/render') && url.includes('token=')) {
                // Extract the token to construct the DZI image fetch URL directly
                console.log(`Intercepted DeepZoom Request: ${url}`);
                // A Preservica DZI request format:
                // /Render/render/resource/{entity_id}/openseadragon/image?token=...
                imageUrl = url;
            }
        });

        // Reload to trigger network requests again now that the listener is active
        await page.reload({ waitUntil: 'networkidle2' });
        if (imageUrl) {
            console.log(`\n🎉 BINGO: Raw Archival Image URL Found: \n${imageUrl}\n`);
        } else {
            console.log("❌ Could not intercept OpenSeadragon Token.");
        }
    } catch (e) {
        console.error("Navigation error:", e.message);
    } finally {
        await browser.close();
    }
})();
