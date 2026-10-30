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

    const activeLink = document.querySelector(`.toc-link[href="#${id}"]`) as HTMLElement;
    if (activeLink) {
        activeLink.classList.remove("text-gray-400", "border-transparent");
        activeLink.classList.add("text-[#3F89FC]", "border-[#3F89FC]", "font-bold");
        
        // Scroll only the TOC container, not the entire page
        const container = activeLink.closest('.custom-scrollbar');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const linkRect = activeLink.getBoundingClientRect();
            const relativeTop = linkRect.top - containerRect.top;
            const targetScroll = container.scrollTop + relativeTop - (containerRect.height / 2) + (linkRect.height / 2);
            
            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }

    // Mobile TOC Styling
    document.querySelectorAll(".mobile-toc-link").forEach((link) => {
        link.classList.remove("text-white", "border-blue-500");
        link.classList.add("text-gray-400", "border-transparent");
    });
    const activeMobileLink = document.querySelector(
        `.mobile-toc-link[href="#${id}"]`
    ) as HTMLElement;
    if (activeMobileLink) {
        activeMobileLink.classList.remove("text-gray-400", "border-transparent");
        activeMobileLink.classList.add("text-white", "border-blue-500");
        
        // Mobile TOC usually has high-level scroll container
        const container = activeMobileLink.closest('.overflow-y-auto');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const linkRect = activeMobileLink.getBoundingClientRect();
            const relativeTop = linkRect.top - containerRect.top;
            const targetScroll = container.scrollTop + relativeTop - (containerRect.height / 2) + (linkRect.height / 2);
            
            container.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }
}

/**
 * Set up IntersectionObserver with a precise rootMargin to watch the top of the viewport.
 */
const setupObserver = () => {
    if (tocObserver) {
        tocObserver.disconnect();
    }

    // Narrow band at the top of viewport to detect current heading precisely
    const options = {
        rootMargin: "-120px 0% -75% 0%",
        threshold: [0, 1]
    };

    tocObserver = new IntersectionObserver((entries) => {
        // Collect all intersecting headings to pick the best candidate
        const intersecting = entries.filter(e => e.isIntersecting);
        if (intersecting.length > 0) {
            // Pick the one closest to our threshold top
            const target = intersecting.reduce((prev, curr) => 
                Math.abs(curr.boundingClientRect.top - 128) < Math.abs(prev.boundingClientRect.top - 128) ? curr : prev
            );
            updateActiveLink(target.target.id);
        }
    }, options);

    document.querySelectorAll("article h2, article h3").forEach((heading) => {
        tocObserver?.observe(heading);
    });
};

/**
 * Robust logic to determine the active heading based on viewport position.
 */
function updateInitialActive() {
    const headings = Array.from(document.querySelectorAll("article h2, article h3"));
    if (headings.length === 0) return;

    // Threshold matches scroll-mt (128px) plus a small buffer
    const threshold = 140;
    
    // Find the last heading that has passed the threshold
    let activeId = headings[0].id;
    for (const heading of headings) {
        if (heading.getBoundingClientRect().top < threshold) {
            activeId = heading.id;
        } else {
            break;
        }
    }
    
    if (activeId) updateActiveLink(activeId);
}

/**
 * Backup listener for fast scrolling or edge cases where IntersectionObserver might miss.
 */
let scrollTimeout: any;
const setupScrollBackup = () => {
    window.addEventListener('scroll', () => {
        if (scrollTimeout) window.clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateInitialActive, 150);
    }, { passive: true });
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
    setupScrollBackup();
    setupMobileTOC();
    initTabs();

    // Re-check on scroll end or after a small timeout to handle layout shifts (images, etc)
    setTimeout(updateInitialActive, 100);
}
