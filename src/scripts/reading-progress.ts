/**
 * Reading Progress Indicator
 * Handles the visual scroll progress bar.
 */

export function initReadingProgress() {
    const progressBar = document.getElementById("reading-progress-bar");
    if (!progressBar) return;

    // Determine scroll target (OverlayScrollbars compatible)
    const getScrollTarget = () => {
        return document.querySelector('.os-viewport') || window;
    };

    let scrollTarget = getScrollTarget();

    const updateProgress = () => {
        const articleContainer = document.getElementById("article-main-container");

        let scrollTop = 0;
        let scrollHeight = 0;
        let clientHeight = 0;
        let currentScrollY = 0;

        if (scrollTarget instanceof Window) {
            scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
            currentScrollY = window.scrollY;
        } else {
            const el = scrollTarget as HTMLElement;
            scrollTop = el.scrollTop;
            scrollHeight = el.scrollHeight;
            clientHeight = el.clientHeight;
            currentScrollY = el.scrollTop;
        }

        let scrolled = 0;

        if (articleContainer) {
            // Calculate based on specific container
            const containerRect = articleContainer.getBoundingClientRect();
            // containerRect.top is relative to viewport. 
            // The actual top position in the scrollable content is:
            const containerTop = containerRect.top + currentScrollY;
            const containerHeight = containerRect.height;
            const windowHeight = clientHeight;

            // Start counting when the top of the container is at the top of the viewport
            // End counting when the bottom of the container hits the bottom of the viewport
            const start = containerTop;
            const end = containerTop + containerHeight - windowHeight;

            if (currentScrollY < start) {
                scrolled = 0;
            } else if (currentScrollY > end) {
                scrolled = 100;
            } else {
                scrolled = ((currentScrollY - start) / (end - start)) * 100;
            }
        } else {
            // Fallback to full page
            if (scrollHeight - clientHeight > 0) {
                scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
            } else {
                scrolled = 0;
            }
        }

        progressBar.style.width = `${scrolled}%`;
    };

    // Remove previous listeners if any (optional safety)

    // Attach listeners
    scrollTarget.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);
    updateProgress();

    document.addEventListener(
        "astro:before-swap",
        () => {
            scrollTarget.removeEventListener("scroll", updateProgress);
            window.removeEventListener("resize", updateProgress);
        },
        { once: true }
    );
}
