/**
 * Scroll Persistence
 * Remembers the scroll position for each page.
 */

export function initScrollPersistence() {
    // Only run on article pages
    const articleContainer = document.getElementById("article-main-container");
    if (!articleContainer) return;

    const rangePath = window.location.pathname;
    const path = rangePath.endsWith('/') && rangePath.length > 1 ? rangePath.slice(0, -1) : rangePath;
    const storageKey = `scroll-position-${path}`;
    
    // Save this as the absolute last read article (excluding about page)
    if (path !== "/about" && path !== "/about/") {
        localStorage.setItem("last-read-article", path);
    }
    
    // Flag to prevent saving during restoration phase
    let isInitialized = false;

    // Get the scroll target or OS instance
    const getOSInstance = () => (window as any).overlayscrollbarsInstance;
    
    const getScrollTop = () => {
        const osInstance = getOSInstance();
        if (osInstance) {
            return osInstance.elements().viewport.scrollTop;
        }
        return window.scrollY || document.documentElement.scrollTop;
    };

    const setScrollTop = (top: number) => {
        const osInstance = getOSInstance();
        if (osInstance) {
            const { viewport } = osInstance.elements();
            viewport.scrollTop = top;
        } else {
            window.scrollTo({ top, behavior: 'auto' });
        }
    };

    const restorePosition = () => {
        // If there's a hash, let the browser handle it
        if (window.location.hash) {
            isInitialized = true;
            return;
        }

        const savedPosition = localStorage.getItem(storageKey);
        if (savedPosition) {
            const top = parseFloat(savedPosition);
            if (!isNaN(top) && top > 50) {
                // If user has already scrolled manually more than 100px, don't yank them back
                if (getScrollTop() > 100) {
                    isInitialized = true;
                    return;
                }
                setScrollTop(top);
            }
        }
        
        // Mark as initialized after a short delay to allow everything to settle
        setTimeout(() => {
            isInitialized = true;
        }, 500);
    };

    // Restoration attempts
    // Try multiple times as OS might initialize late
    setTimeout(restorePosition, 100);
    setTimeout(restorePosition, 400);

    // Save position on scroll (throttled)
    let isTicking = false;
    const handleScroll = (e: Event) => {
        // Prevent saving if we are still initializing or if user is at the very top
        if (!isInitialized) return;

        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const scrollTop = getScrollTop();
                
                // Only save if we've scrolled a reasonable amount
                if (scrollTop > 100) {
                    localStorage.setItem(storageKey, scrollTop.toString());
                } else if (scrollTop < 50) {
                    // If near top, clear it
                    localStorage.removeItem(storageKey);
                }
                
                isTicking = false;
            });
            isTicking = true;
        }
    };

    // Capture scroll events (works for both window and OS viewport if we use capture)
    window.addEventListener("scroll", handleScroll, true);

    // Clean up
    document.addEventListener(
        "astro:before-swap",
        () => {
            window.removeEventListener("scroll", handleScroll, true);
        },
        { once: true }
    );
}
