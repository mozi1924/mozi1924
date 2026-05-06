import { ICONS } from "./icons";

let mermaidInstancePromise: Promise<any> | null = null;

const getMermaid = async () => {
  if (!mermaidInstancePromise) {
    mermaidInstancePromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
        fontFamily: "inherit",
        deterministicIds: true,
      });
      return mermaid;
    });
  }
  return mermaidInstancePromise;
};

const collectMermaidPreBlocks = (): HTMLPreElement[] => {
  const candidates: HTMLPreElement[] = [];

  const pushCandidate = (pre: HTMLPreElement | null) => {
    if (!pre) return;
    if (pre.getAttribute("data-mermaid-processed")) return;
    if (candidates.includes(pre)) return;
    candidates.push(pre);
  };

  for (const pre of document.querySelectorAll("pre[data-language='mermaid'], pre.mermaid")) {
    pushCandidate(pre instanceof HTMLPreElement ? pre : null);
  }

  for (const code of document.querySelectorAll("pre > code.language-mermaid")) {
    const parentPre = code.closest("pre");
    pushCandidate(parentPre instanceof HTMLPreElement ? parentPre : null);
  }

  return candidates;
};

function setupMermaidViewer(wrapper: HTMLElement, svgContainer: HTMLElement, originalCode: string) {
  const viewport = wrapper.querySelector('.mermaid-viewport') as HTMLElement;
  const toolbar = wrapper.querySelector('.mermaid-toolbar') as HTMLElement;
  const resetBtn = toolbar.querySelector('[data-action="reset"]') as HTMLElement;
  
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  
  const ZOOM_STEP = 0.1;
  const MAX_SCALE = 10;
  const MIN_SCALE = 0.1;

  const updateTransform = () => {
    // Apply transform to the container for smooth panning and scaling
    // We use translate3d to hint the browser but avoid forcing a low-res rasterization layer if possible
    // Actually, simple translate + scale is usually better for SVGs to stay sharp
    svgContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    if (resetBtn) {
      resetBtn.textContent = `${Math.round(scale * 100)}%`;
    }
  };

  // Initial fit logic
  const fitToViewport = () => {
    const vWidth = viewport.clientWidth - 40; // Reduced padding for better use of space
    const vHeight = viewport.clientHeight - 40;
    const svgElement = svgContainer.querySelector('svg');
    if (!svgElement || vWidth <= 0 || vHeight <= 0) return;

    // 1. Get intrinsic dimensions
    let svgWidth = 0;
    let svgHeight = 0;
    const viewBox = svgElement.viewBox.baseVal;
    
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
      svgWidth = viewBox.width;
      svgHeight = viewBox.height;
    } else {
      // Fallback to BBox if no viewBox
      const bbox = svgElement.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        svgWidth = bbox.width;
        svgHeight = bbox.height;
      }
    }

    // 2. Fallback to attributes if all else fails
    if (svgWidth <= 0) {
      svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
      svgHeight = parseFloat(svgElement.getAttribute('height') || '0');
    }

    if (svgWidth > 0 && svgHeight > 0) {
      // 3. Set EXPLICIT pixel dimensions to prevent the SVG from collapsing in the flex container
      svgElement.style.width = `${svgWidth}px`;
      svgElement.style.height = `${svgHeight}px`;
      svgElement.style.maxWidth = 'none';
      svgElement.style.maxHeight = 'none';

      // 4. Calculate scale
      const scaleX = vWidth / svgWidth;
      const scaleY = vHeight / svgHeight;
      scale = Math.min(scaleX, scaleY, 1.2);
      
      if (scale < 0.05) scale = 0.05;
      
      // 5. Reset translation
      translateX = 0;
      translateY = 0;
      updateTransform();
    }
  };

  // Wait for layout to stabilize
  setTimeout(fitToViewport, 100);

  // Zoom controls
  toolbar.querySelector('[data-action="zoom-in"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.min(scale + ZOOM_STEP * 2, MAX_SCALE);
    updateTransform();
  });

  toolbar.querySelector('[data-action="zoom-out"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.max(scale - ZOOM_STEP * 2, MIN_SCALE);
    updateTransform();
  });

  toolbar.querySelector('[data-action="reset"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    fitToViewport();
  });

  // Mouse wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY);
    const zoomFactor = 1.1;
    const newScale = delta > 0 
      ? Math.min(scale * zoomFactor, MAX_SCALE)
      : Math.max(scale / zoomFactor, MIN_SCALE);
    
    if (newScale !== scale) {
      // Optional: zoom towards mouse position (complex logic, keeping it simple for now)
      scale = newScale;
      updateTransform();
    }
  }, { passive: false });

  // Fullscreen
  toolbar.querySelector('[data-action="maximize"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Handle resize for fullscreen/window resize
  const resizeObserver = new ResizeObserver(() => {
    // Only auto-fit if we haven't manually panned/zoomed much? 
    // For now, let's just allow manual reset. 
    // But we need initial fit when entering fullscreen.
  });
  resizeObserver.observe(wrapper);

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === wrapper) {
      setTimeout(fitToViewport, 100);
    }
  });

  // Copy code
  const copyBtn = toolbar.querySelector('[data-action="copy"]');
  copyBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(originalCode).then(() => {
      const originalIcon = copyBtn.innerHTML;
      copyBtn.innerHTML = ICONS.check;
      copyBtn.classList.add('text-emerald-400');
      setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
        copyBtn.classList.remove('text-emerald-400');
      }, 2000);
    });
  });

  // Download SVG
  toolbar.querySelector('[data-action="download"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const svgElement = svgContainer.querySelector('svg');
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // Panning logic
  let isPanning = false;
  let lastX: number, lastY: number;

  const startPanning = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isPanning = true;
    viewport.classList.add('cursor-grabbing');
    lastX = e.pageX;
    lastY = e.pageY;
  };

  const pan = (e: MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.pageX - lastX;
    const dy = e.pageY - lastY;
    translateX += dx;
    translateY += dy;
    lastX = e.pageX;
    lastY = e.pageY;
    updateTransform();
  };

  const stopPanning = () => {
    isPanning = false;
    viewport.classList.remove('cursor-grabbing');
  };

  viewport.addEventListener('mousedown', startPanning);
  window.addEventListener('mousemove', pan);
  window.addEventListener('mouseup', stopPanning);
}

export const renderMermaid = async () => {
  const mermaidBlocks = collectMermaidPreBlocks();
  if (mermaidBlocks.length === 0) return;

  const mermaid = await getMermaid();

  for (const block of mermaidBlocks) {
    block.setAttribute("data-mermaid-processed", "processing");

    // Capture original dimensions
    const originalHeight = block.offsetHeight;
    const codeNode = block.querySelector("code");
    const code = codeNode?.textContent?.trim() || block.textContent?.trim() || "";
    
    if (!code) {
      block.setAttribute("data-mermaid-processed", "empty");
      continue;
    }

    const uuid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11);
    const id = `mermaid-${uuid}`;

    try {
      const { svg } = await mermaid.render(id, code);
      
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-viewer-wrapper group relative my-8 rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden transition-all duration-300 hover:border-white/20';
      
      // Improve height handling: use a reasonable range
      const height = Math.max(originalHeight, 400);
      wrapper.style.height = `${Math.min(height, 800)}px`;
      
      wrapper.innerHTML = `
        <div class="mermaid-viewport cursor-grab h-full w-full overflow-hidden flex justify-center items-center bg-[#0d0d0d]/50">
          <div class="mermaid-svg-container flex items-center justify-center transition-transform duration-75 ease-out">
            ${svg}
          </div>
        </div>
        <div class="mermaid-toolbar absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-md opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 shadow-xl">
          <button data-action="zoom-out" class="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Zoom Out">${ICONS.zoomOut}</button>
          <button data-action="reset" class="px-3 py-1 text-xs font-medium rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors min-w-[50px] text-center" title="Fit to screen">100%</button>
          <button data-action="zoom-in" class="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Zoom In">${ICONS.zoomIn}</button>
          <div class="w-px h-4 bg-white/10 mx-1"></div>
          <button data-action="maximize" class="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Fullscreen">${ICONS.maximize}</button>
          <button data-action="copy" class="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Copy Code">${ICONS.copy}</button>
          <button data-action="download" class="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Download SVG">${ICONS.download}</button>
        </div>
      `;

      const svgContainer = wrapper.querySelector('.mermaid-svg-container') as HTMLElement;
      const svgElement = svgContainer.querySelector('svg') as SVGSVGElement;
      
      // We don't remove attributes here anymore; fitToViewport in setupMermaidViewer 
      // will handle the styles and dimensions correctly after measurement.
      svgElement.style.maxWidth = 'none';
      svgElement.style.maxHeight = 'none';

      block.replaceWith(wrapper);
      
      // Setup after inserting into DOM to ensure clientWidth/Height are available
      setupMermaidViewer(wrapper, svgContainer, code);
    } catch (error) {
      console.error('Mermaid rendering failed:', error);
      block.setAttribute('data-mermaid-processed', 'error');
    }
  }
};
