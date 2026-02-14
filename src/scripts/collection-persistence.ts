/**
 * Collection Persistence
 * Handles scrolling to and highlighting the last read article in list pages.
 */

export function initCollectionPersistence() {
    let lastReadPath = localStorage.getItem("last-read-article");
    if (!lastReadPath) return;

    // Normalize stored path (remove trailing slash)
    const normalizedPath = lastReadPath.endsWith('/') && lastReadPath.length > 1 
        ? lastReadPath.slice(0, -1) 
        : lastReadPath;

    // Find the article card that matches the last read path
    // 1. Precise match (normalized or with trailing slash)
    let targetCard: HTMLElement | null = document.querySelector(`[data-article-path="${normalizedPath}"]`) 
                 || document.querySelector(`[data-article-path="${normalizedPath}/"]`);
    
    // 2. Partial match for series (if the last read path is a sub-path of a card path)
    if (!targetCard) {
        const allCards = Array.from(document.querySelectorAll('[data-article-path]')) as HTMLElement[];
        targetCard = allCards.find(card => {
            const cardPath = card.getAttribute('data-article-path');
            return cardPath && normalizedPath.startsWith(cardPath + '/');
        }) || null;
    }
    
    if (targetCard) {
        // Add highlight effect - adding a bit more prominent styles for mobile
        targetCard.classList.add(
            "ring-2", 
            "ring-blue-500/60", 
            "border-blue-500/50", 
            "bg-blue-500/10",
            "shadow-lg",
            "z-20"
        );
        
        // Ensure the card is relatively positioned if it isn't already, so z-index works
        if (targetCard instanceof HTMLElement && getComputedStyle(targetCard).position === 'static') {
            targetCard.style.position = 'relative';
        }

        // Scroll to it with a slightly longer delay to ensure mobile layout is ready
        setTimeout(() => {
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 600);
    }
}
