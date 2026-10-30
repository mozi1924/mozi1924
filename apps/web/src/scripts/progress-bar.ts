/**
 * Global Page Load Progress Bar
 * Handles the visual progress indicator for Astro View Transitions.
 * Uses a singleton pattern to ensure listeners are attached only once.
 */

export function initProgressBar() {
    // Prevent multiple initializations
    if ((window as any).__PROGRESS_BAR_INIT__) return;
    (window as any).__PROGRESS_BAR_INIT__ = true;

    const getProgressBar = () => document.getElementById("page-load-progress-bar");

    const resetProgress = () => {
        const bar = getProgressBar();
        if (!bar) return;
        bar.style.transition = "none";
        bar.style.width = "0%";
        bar.style.opacity = "0";
        void bar.offsetWidth; // Force reflow
    };

    const completeProgress = () => {
        const bar = getProgressBar();
        if (!bar) return;

        bar.style.transition = "width 0.2s ease-out, opacity 0.2s ease-out";
        bar.style.width = "100%";

        setTimeout(() => {
            if (!bar) return;
            bar.style.opacity = "0";
            setTimeout(() => {
                if (!bar) return;
                bar.style.transition = "none";
                bar.style.width = "0%";
            }, 200);
        }, 300);
    };

    const startProgress = () => {
        const bar = getProgressBar();
        if (!bar) return;

        resetProgress();

        // Ensure we handle the completion of THIS navigation
        document.addEventListener("astro:page-load", completeProgress, { once: true });

        bar.style.transition = "width 0.2s ease-out, opacity 0.2s ease-out";
        bar.style.opacity = "1";
        bar.style.width = "20%";

        const simulate = () => {
            const b = getProgressBar();
            if (!b) return;
            if (b.style.opacity === "0" || b.style.width === "100%") return;

            const currentWidth = parseFloat(b.style.width) || 0;
            if (currentWidth < 90) {
                const increment = Math.random() * 10 + 5;
                b.style.width = `${Math.min(currentWidth + increment, 90)}%`;
                requestAnimationFrame(() => setTimeout(simulate, 200));
            }
        };
        setTimeout(simulate, 200);
    };

    const boostProgress = () => {
        const bar = getProgressBar();
        if (!bar || bar.style.opacity === "0") return;

        const currentWidth = parseFloat(bar.style.width) || 0;
        bar.style.width = `${Math.min(currentWidth + 20, 95)}%`;
    };

    const handleLinkClick = (e: Event) => {
        const target = (e.target as Element)?.closest("a");
        if (!target) return;

        const href = target.getAttribute("href");
        if (!href) return;

        const mouseEvent = e as MouseEvent;
        if (
            href.startsWith("/") &&
            !href.startsWith("#") &&
            target.target !== "_blank" &&
            !mouseEvent.ctrlKey &&
            !mouseEvent.metaKey &&
            !mouseEvent.shiftKey &&
            !mouseEvent.altKey
        ) {
            startProgress();
        }
    };

    // Attach global listeners
    document.addEventListener("astro:before-preparation", startProgress);
    document.addEventListener("astro:after-preparation", boostProgress);
    document.addEventListener("click", handleLinkClick);
}
