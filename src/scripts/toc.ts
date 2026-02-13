/**
 * Persistent observer to allow cleanup between navigations.
 */
let tocObserver: IntersectionObserver | null = null;

/**
 * Updates the active class for TOC links.
 * @param {string} id - The ID of the section to highlight.
 */
function updateActiveLink(id: string) {
    // Update Desktop TOC
    document.querySelectorAll(".toc-link").forEach((link) => {
        link.classList.remove("text-[#3F89FC]", "border-[#3F89FC]", "font-bold");
        link.classList.add("text-gray-400", "border-transparent");
    });

    const activeLink = document.querySelector(`.toc-link[href="#${id}"]`);
    if (activeLink) {
        activeLink.classList.remove("text-gray-400", "border-transparent");
        activeLink.classList.add("text-[#3F89FC]", "border-[#3F89FC]", "font-bold");
    }

    // Mobile TOC Styling
    document.querySelectorAll(".mobile-toc-link").forEach((link) => {
        link.classList.remove("text-white", "border-blue-500");
        link.classList.add("text-gray-400", "border-transparent");
    });
    const activeMobileLink = document.querySelector(
        `.mobile-toc-link[href="#${id}"]`
    );
    if (activeMobileLink) {
        activeMobileLink.classList.remove("text-gray-400", "border-transparent");
        activeMobileLink.classList.add("text-white", "border-blue-500");
    }
}

/**
 * Determine and highlight the active section on initial load.
 * Finds the last heading that is above the reading threshold.
 */
function updateInitialActive() {
    const headings = document.querySelectorAll("article h2, article h3");
    let activeId = "";
    // Offset to consider a header "active" (e.g. passed the sticky header)
    // Sticky header is 96px (top-24), giving a bit more buffer (120px)
    const offset = 120;

    for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        // If the heading is above our threshold, it's a candidate for "active"
        // We want the *last* candidate that is above the threshold.
        if (rect.top < offset) {
            activeId = heading.id;
        } else {
            // Once we hit a heading below the threshold, the previous one stays as the active one.
            break;
        }
    }

    if (activeId) {
        updateActiveLink(activeId);
    }
}

/**
 * Set up IntersectionObserver to highlight TOC links as the user scrolls.
 */
const setupObserver = () => {
    // Disconnect existing observer if it exists
    if (tocObserver) {
        tocObserver.disconnect();
    }

    tocObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const id = entry.target.getAttribute("id");
            if (entry.intersectionRatio > 0 && id) {
                updateActiveLink(id);
            }
        });
    });

    // Track all headings that have an id
    document.querySelectorAll("article h2, article h3").forEach((heading) => {
        tocObserver?.observe(heading);
    });
};

/**
 * Set up mobile TOC button, overlay, and sheet behavior.
 */
const setupMobileTOC = () => {
    const btn = document.getElementById("mobile-toc-btn");
    const overlay = document.getElementById("mobile-toc-overlay");
    const sheet = document.getElementById("mobile-toc-sheet");
    const backdrop = document.getElementById("mobile-toc-backdrop");
    const closeBtn = document.getElementById("mobile-toc-close");
    const links = document.querySelectorAll(".mobile-toc-link");

    if (btn && overlay && sheet && backdrop && closeBtn) {
        const openMenu = () => {
            overlay.classList.remove("opacity-0", "pointer-events-none");
            sheet.classList.remove("translate-y-full");
        };

        const closeMenu = () => {
            sheet.classList.add("translate-y-full");
            overlay.classList.add("opacity-0", "pointer-events-none");
        };


        btn.addEventListener("click", openMenu);
        backdrop.addEventListener("click", closeMenu);
        closeBtn.addEventListener("click", closeMenu);

        links.forEach((link) => {
            link.addEventListener("click", closeMenu);
        });
    }
};

/**
 * Initializes tab switching logic for both mobile and desktop.
 */
function initTabs() {
    const configs = [
        {
            btnToc: "tab-toc-btn",
            btnSeries: "tab-series-btn",
            contentToc: "tab-toc-content",
            contentSeries: "tab-series-content",
            indicator: "tab-indicator"
        },
        {
            btnToc: "mobile-tab-toc-btn",
            btnSeries: "mobile-tab-series-btn",
            contentToc: "mobile-tab-toc-content",
            contentSeries: "mobile-tab-series-content",
            indicator: "mobile-tab-indicator"
        }
    ];

    configs.forEach(config => {
        const btnToc = document.getElementById(config.btnToc);
        const btnSeries = document.getElementById(config.btnSeries);
        const contentToc = document.getElementById(config.contentToc);
        const contentSeries = document.getElementById(config.contentSeries);
        const indicator = document.getElementById(config.indicator);

        if (btnToc && btnSeries && contentToc && contentSeries) {
            btnToc.addEventListener("click", () => {
                btnToc.classList.add("text-white", "font-bold");
                btnToc.classList.remove("text-gray-400", "font-medium");
                btnSeries.classList.add("text-gray-400", "font-medium");
                btnSeries.classList.remove("text-white", "font-bold");
                contentToc.classList.remove("hidden");
                contentSeries.classList.add("hidden");
                if (indicator) indicator.style.transform = "translateX(0)";
            });

            btnSeries.addEventListener("click", () => {
                btnSeries.classList.add("text-white", "font-bold");
                btnSeries.classList.remove("text-gray-400", "font-medium");
                btnToc.classList.add("text-gray-400", "font-medium");
                btnToc.classList.remove("text-white", "font-bold");
                contentSeries.classList.remove("hidden");
                contentToc.classList.add("hidden");
                if (indicator) indicator.style.transform = "translateX(100%)";
            });
        }
    });
}

/**
 * Initializes TOC logic.
 */
export function initTOC() {
    updateInitialActive();
    setupObserver();
    setupMobileTOC();
    initTabs();

    // Re-check on scroll end or after a small timeout to handle layout shifts (images, etc)
    setTimeout(updateInitialActive, 100);
}
