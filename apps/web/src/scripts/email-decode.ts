/**
 * Decodes a Cloudflare obfuscated email string.
 * @param {string} encoded
 */
function decodeEmail(encoded: string) {
    let email = "";
    try {
        const r = parseInt(encoded.slice(0, 2), 16);
        for (let n = 2; n < encoded.length; n += 2) {
            const charCode = parseInt(encoded.slice(n, n + 2), 16) ^ r;
            email += String.fromCharCode(charCode);
        }
    } catch (e) {
        console.error("Error decoding email:", e);
    }
    return email;
}

/**
 * Initializes email decoding for Cloudflare Email Obfuscation recovery.
 */
export function initEmailDecode() {
    // 1. Restore the visual email address (handle .__cf_email__ spans)
    const emailElements = document.querySelectorAll(".__cf_email__");
    emailElements.forEach((el) => {
        const encoded = el.getAttribute("data-cfemail");
        if (encoded) {
            const email = decodeEmail(encoded);
            // If the element is specifically a span placeholder, replace it
            el.replaceWith(document.createTextNode(email));
        }
    });

    // 2. Restore mailto links (handle href="/cdn-cgi/l/email-protection#...")
    const protectedLinks = document.querySelectorAll(
        'a[href*="/cdn-cgi/l/email-protection"]'
    );
    protectedLinks.forEach((link) => {
        const href = link.getAttribute("href");
        const hashIndex = href ? href.indexOf("#") : -1;
        if (hashIndex !== -1 && href) {
            const encoded = href.slice(hashIndex + 1);
            const email = decodeEmail(encoded);
            link.setAttribute("href", "mailto:" + email);
            // Optional: If the link text is "[email protected]" and wasn't handled by step 1
            if (link.textContent?.includes("[email protected]")) {
                link.textContent = email;
            }
        }
    });
}
