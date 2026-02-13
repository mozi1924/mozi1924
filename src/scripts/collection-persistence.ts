/**
 * Collection Persistence
 * Handles scrolling to and highlighting the last read article in list pages.
 */

export function initCollectionPersistence() {
    const lastReadPath = localStorage.getItem("last-read-article");
    if (!lastReadPath) return;

    // Find the article card that matches the last read path
    // We search for elements with data-article-path
    const targetCard = document.querySelector(`[data-article-path="${lastReadPath}"]`);
    
    if (targetCard) {
        // Add highlight effect
        targetCard.classList.add("ring-2", "ring-blue-500/50", "border-blue-500/50", "bg-blue-500/5");
        
        // Scroll to it
        setTimeout(() => {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
}
