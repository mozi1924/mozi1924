/**
 * Set up IntersectionObserver to highlight TOC links as the user scrolls.
 */
const setupObserver = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const id = entry.target.getAttribute("id");
            if (entry.intersectionRatio > 0) {
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
        });
    });

    // Track all headings that have an id
    document.querySelectorAll("article h2, article h3").forEach((heading) => {
        observer.observe(heading);
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

        btn.onclick = openMenu;
        backdrop.onclick = closeMenu;
        closeBtn.onclick = closeMenu;

        links.forEach((link) => {
            link.addEventListener("click", closeMenu);
        });
    }
};

/**
 * Initializes TOC logic.
 */
export function initTOC() {
    setupObserver();
    setupMobileTOC();
}
