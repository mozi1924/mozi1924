/**
 * Unified Scroll Lock Utility
 * Shared absolute singleton across all apps and bundles via the window object.
 * Seamlessly integrates with both OverlayScrollbars and native body scrolling.
 */

export interface ScrollLockInstance {
  lock: () => void;
  unlock: (delay?: number) => void;
  clear: () => void;
}

const createScrollLock = (): ScrollLockInstance => {
  let lockCount = 0;

  return {
    lock() {
      if (typeof window === "undefined") return;
      lockCount++;
      if (lockCount > 1) return;

      const osInstance = (window as any).overlayscrollbarsInstance;
      const body = document.body;

      if (osInstance) {
        osInstance.options({ overflow: { y: "hidden" } });
      } else {
        body.style.overflow = "hidden";
        body.style.paddingRight = "var(--os-scrollbar-placeholder-size, 0px)";
      }
      body.dataset.scrollLocked = "true";
    },

    unlock(delay = 0) {
      if (typeof window === "undefined") return;

      const performUnlock = () => {
        if (lockCount <= 0) {
          lockCount = 0;
          return;
        }
        lockCount--;
        if (lockCount > 0) return;

        const osInstance = (window as any).overlayscrollbarsInstance;
        const body = document.body;

        if (osInstance) {
          osInstance.options({ overflow: { y: "scroll" } });
        } else {
          body.style.overflow = "";
          body.style.paddingRight = "";
        }
        delete body.dataset.scrollLocked;
      };

      if (delay > 0) {
        setTimeout(performUnlock, delay);
      } else {
        performUnlock();
      }
    },

    clear() {
      if (typeof window === "undefined") return;
      lockCount = 0;
      const osInstance = (window as any).overlayscrollbarsInstance;
      const body = document.body;

      if (osInstance) {
        osInstance.options({ overflow: { y: "scroll" } });
      } else {
        body.style.overflow = "";
        body.style.paddingRight = "";
      }
      delete body.dataset.scrollLocked;
    },
  };
};

const getScrollLock = (): ScrollLockInstance => {
  if (typeof window === "undefined") {
    return { lock: () => {}, unlock: () => {}, clear: () => {} };
  }

  if (!(window as any).__scrollLock) {
    (window as any).__scrollLock = createScrollLock();
  }
  return (window as any).__scrollLock;
};

export const scrollLock = getScrollLock();
