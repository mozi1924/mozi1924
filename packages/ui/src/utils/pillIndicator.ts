/**
 * Reusable sliding pill indicator controller for tablists, segmented controls,
 * and navigation bars across the mozi1924 ecosystem.
 */

export interface PillIndicatorOptions {
  /** The container element (or selector string) holding the items and indicator */
  container: HTMLElement | string | null;
  /** The indicator element (or selector string) that slides between items */
  indicator: HTMLElement | string | null;
  /** The initial active element to snap to without animation */
  initialActive?: HTMLElement | null;
  /** Transition duration in ms, default 300 */
  duration?: number;
  /** Cubic bezier or CSS easing string, default 'cubic-bezier(0.16, 1, 0.3, 1)' */
  easing?: string;
  /** Whether to scroll target element into view within scrollable container. Default false */
  scrollIntoView?: boolean;
  /** Whether to enable hover following across items within container */
  hover?: boolean;
  /** Selector for interactive items within container if hover is enabled, e.g. '[data-nav-link]' */
  itemSelector?: string;
}

export interface PillIndicatorInstance {
  /** Move indicator to target element. If smooth is true, animates. If false, snaps instantly. If null, fades out. */
  moveTo: (target: HTMLElement | null, smooth?: boolean) => void;
  /** Set the permanent active element (used as the return target when mouse leaves container) */
  setActive: (target: HTMLElement | null, smooth?: boolean) => void;
  /** Recalculate and update position of the current active element */
  update: (smooth?: boolean) => void;
  /** Get current active element */
  getActiveElement: () => HTMLElement | null;
  /** Destroy event listeners */
  destroy: () => void;
}

/**
 * Accurately compute coordinates and size of target element relative to container's padding-box.
 */
function computePillPosition(container: HTMLElement, target: HTMLElement) {
  // If container is the direct offsetParent, target.offsetLeft/offsetTop is native and exact
  if (target.offsetParent === container) {
    return {
      left: target.offsetLeft,
      top: target.offsetTop,
      width: target.offsetWidth,
      height: target.offsetHeight,
    };
  }

  // Otherwise calculate relative to container's padding-box
  const targetRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const style = window.getComputedStyle(container);
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;

  return {
    left: targetRect.left - containerRect.left + container.scrollLeft - borderLeft,
    top: targetRect.top - containerRect.top + container.scrollTop - borderTop,
    width: targetRect.width,
    height: targetRect.height,
  };
}

/**
 * Create and attach a sliding pill indicator to a container.
 */
export function createPillIndicator(options: PillIndicatorOptions): PillIndicatorInstance {
  // SSR Guard
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      moveTo: () => {},
      setActive: () => {},
      update: () => {},
      getActiveElement: () => null,
      destroy: () => {},
    };
  }

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  const indicator = typeof options.indicator === "string"
    ? document.querySelector<HTMLElement>(options.indicator)
    : options.indicator;

  if (!container || !indicator) {
    return {
      moveTo: () => {},
      setActive: () => {},
      update: () => {},
      getActiveElement: () => null,
      destroy: () => {},
    };
  }

  // Clean up any previously attached controller on the same indicator element
  if ((indicator as any)._pillController) {
    try {
      (indicator as any)._pillController.destroy();
    } catch {}
  }

  const duration = options.duration ?? 300;
  const easing = options.easing ?? "cubic-bezier(0.16, 1, 0.3, 1)";
  const transitionStyle = `all ${duration}ms ${easing}`;

  let activeElement: HTMLElement | null = options.initialActive ?? null;
  let currentTarget: HTMLElement | null = activeElement;
  let isDestroyed = false;
  const cleanups: (() => void)[] = [];

  function moveTo(target: HTMLElement | null, smooth = true) {
    if (isDestroyed || !indicator || !container) return;

    if (!target) {
      indicator.style.opacity = "0";
      currentTarget = null;
      return;
    }

    currentTarget = target;

    // Check if element is displayed / connected
    if (
      !target.isConnected ||
      (target.offsetWidth === 0 && target.offsetHeight === 0 && target.getClientRects().length === 0)
    ) {
      indicator.style.opacity = "0";
      return;
    }

    if (!smooth) {
      indicator.style.transition = "none";
    } else {
      indicator.style.transition = transitionStyle;
    }

    const pos = computePillPosition(container, target);
    indicator.style.left = `${pos.left}px`;
    indicator.style.top = `${pos.top}px`;
    indicator.style.width = `${pos.width}px`;
    indicator.style.height = `${pos.height}px`;
    indicator.style.opacity = "1";

    if (!smooth) {
      void indicator.offsetHeight;
      indicator.style.transition = "";
    }

    // Optional horizontal container auto-scroll (does not affect vertical window scroll)
    if (options.scrollIntoView && container.scrollWidth > container.clientWidth) {
      const targetLeft = target.offsetLeft;
      const targetRight = targetLeft + target.offsetWidth;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;

      if (targetLeft < viewLeft) {
        container.scrollTo({ left: targetLeft, behavior: "smooth" });
      } else if (targetRight > viewRight) {
        container.scrollTo({ left: targetRight - container.clientWidth, behavior: "smooth" });
      }
    }
  }

  function setActive(target: HTMLElement | null, smooth = true) {
    activeElement = target;
    moveTo(target, smooth);
  }

  function update(smooth = false) {
    if (activeElement) {
      moveTo(activeElement, smooth);
    }
  }

  // Hover following support across nav items
  if (options.hover && options.itemSelector) {
    const items = container.querySelectorAll<HTMLElement>(options.itemSelector);
    items.forEach((item) => {
      const onEnter = () => moveTo(item, true);
      item.addEventListener("mouseenter", onEnter);
      cleanups.push(() => item.removeEventListener("mouseenter", onEnter));
    });

    const onLeave = () => {
      moveTo(activeElement, true);
    };
    container.addEventListener("mouseleave", onLeave);
    cleanups.push(() => container.removeEventListener("mouseleave", onLeave));
  }

  // Window resize handler (always snap without lag)
  const handleResize = () => {
    if (activeElement) {
      moveTo(activeElement, false);
    }
  };
  window.addEventListener("resize", handleResize);

  // Sync with web font loading
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      if (activeElement) {
        moveTo(activeElement, false);
      }
    });
  }

  // Destroy cleanup
  function destroy() {
    isDestroyed = true;
    window.removeEventListener("resize", handleResize);
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    if (indicator && (indicator as any)._pillController === instance) {
      delete (indicator as any)._pillController;
    }
  }

  // Auto clean-up on Astro page swaps to prevent memory leaks
  document.addEventListener("astro:before-swap", destroy, { once: true });

  const instance: PillIndicatorInstance = {
    moveTo,
    setActive,
    update,
    getActiveElement: () => activeElement,
    destroy,
  };

  (indicator as any)._pillController = instance;

  // Initial positioning: snap immediately and also on next RAF
  if (activeElement) {
    moveTo(activeElement, false);
    requestAnimationFrame(() => {
      if (activeElement && !isDestroyed) {
        moveTo(activeElement, false);
      }
    });
  }

  return instance;
}
