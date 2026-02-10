/**
 * Reading Progress Indicator
 * Handles the visual scroll progress bar.
 */

export function initReadingProgress() {
    const progressBar = document.getElementById("reading-progress-bar");
    if (!progressBar) return;

    const updateProgress = () => {
        const articleContainer = document.getElementById("article-main-container");

        let scrolled = 0;

        if (articleContainer) {
            // Calculate based on specific container
            const containerRect = articleContainer.getBoundingClientRect();
            const containerHeight = containerRect.height;
            const containerTop = containerRect.top + window.scrollY;
            const windowHeight = window.innerHeight;

            // Start counting when the top of the container is at the top of the viewport
            // End counting when the bottom of the container hits the bottom of the viewport
            const start = containerTop;
            const end = containerTop + containerHeight - windowHeight;

            if (window.scrollY < start) {
                scrolled = 0;
            } else if (window.scrollY > end) {
                scrolled = 100;
            } else {
                scrolled = ((window.scrollY - start) / (end - start)) * 100;
            }
        } else {
            // Fallback to full page
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
            scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
        }

        progressBar.style.width = `${scrolled}%`;
    };

    window.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);
    updateProgress();

    document.addEventListener(
        "astro:before-swap",
        () => {
            window.removeEventListener("scroll", updateProgress);
            window.removeEventListener("resize", updateProgress);
        },
        { once: true }
    );
}
