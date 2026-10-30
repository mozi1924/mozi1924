/**
 * Reading Progress Indicator
 * Handles the visual scroll progress bar.
 */

export function initReadingProgress() {
    const progressBar = document.getElementById("reading-progress-bar");
    const container = document.getElementById("reading-progress-container");
    if (!progressBar || !container) return;

    // Check if progress bar should be enabled for the current page
    const shouldEnable = document.body.dataset.readingProgress === "true";

    if (!shouldEnable) {
        container.style.opacity = "0";
        progressBar.style.width = "0%";
        return;
    }

    // Show the container
    container.style.opacity = "1";

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
            const containerTop = containerRect.top + currentScrollY;
            const containerHeight = containerRect.height;
            const windowHeight = clientHeight;

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

    // Attach listeners
    scrollTarget.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);
    updateProgress();

    // Store listener for removal on navigation
    const cleanup = () => {
        scrollTarget.removeEventListener("scroll", updateProgress);
        window.removeEventListener("resize", updateProgress);
    };

    document.addEventListener("astro:before-swap", cleanup, { once: true });
}
