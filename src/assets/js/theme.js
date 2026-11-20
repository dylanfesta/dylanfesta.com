// Conditionally load Popover polyfill only in older browsers lacking native support
if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
  const polyfillUrl = new URL("../vendor/popover.min.js", import.meta.url);
  import(polyfillUrl.href);
}

const schemeMeta = document.querySelector('meta[name="color-scheme"]');
const schemeToggle = document.getElementById("scheme-toggle");
const themeSelect = document.getElementById("theme-select");

function getSystemScheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getRenderedScheme() {
  const content = schemeMeta?.getAttribute("content")?.trim();
  if (content === "dark" || content === "light") return content;
  return getSystemScheme();
}

function applySchemeOverride(storedValue) {
  if (!schemeMeta) return;
  schemeMeta.setAttribute("content", storedValue || "light dark");
}

// Two-state color-scheme toggle (System default <-> Opposite override)
if (schemeToggle && schemeMeta) {
  schemeToggle.addEventListener("click", () => {
    const current = getRenderedScheme();
    const target = current === "dark" ? "light" : "dark";
    const system = getSystemScheme();

    try {
      if (target === system) {
        localStorage.removeItem("color-scheme");
        applySchemeOverride(null);
      } else {
        localStorage.setItem("color-scheme", target);
        applySchemeOverride(target);
      }
    } catch {
      applySchemeOverride(target === system ? null : target);
    }
  });
}

// Live multi-theme switcher in the footer
if (themeSelect) {
  const activeTheme = document.documentElement.dataset.theme;
  if (activeTheme) {
    themeSelect.value = activeTheme;
  }

  themeSelect.addEventListener("change", () => {
    const chosen = themeSelect.value;
    const defaultTheme = document.documentElement.dataset.defaultTheme || "academic";
    document.documentElement.dataset.theme = chosen;

    try {
      if (chosen === defaultTheme) {
        localStorage.removeItem("site-theme");
      } else {
        localStorage.setItem("site-theme", chosen);
      }
    } catch {
      // Ignore storage restrictions; theme still applies for current page view
    }
  });
}

// Keep multiple open tabs synchronized
window.addEventListener("storage", (event) => {
  if (event.key === "color-scheme") {
    applySchemeOverride(event.newValue);
  }
  if (event.key === "site-theme") {
    const defaultTheme = document.documentElement.dataset.defaultTheme || "academic";
    const nextTheme = event.newValue || defaultTheme;
    document.documentElement.dataset.theme = nextTheme;
    if (themeSelect) themeSelect.value = nextTheme;
  }
});

// Responsive Navbar: switch between inline links and native popover without hard-coded breakpoints
const siteHeader = document.querySelector(".site-header");
const headerInner = siteHeader?.querySelector(".header-inner");
const siteMenu = document.getElementById("site-menu");

if (siteHeader && headerInner && siteMenu) {
  let lastHeaderWidth = 0;

  const syncNavLayout = () => {
    const currentWidth = headerInner.clientWidth;
    const wasWide = siteHeader.classList.contains("is-wide");

    // Avoid layout thrashing when collapsed and shrinking further
    if (!wasWide && currentWidth <= lastHeaderWidth && lastHeaderWidth !== 0) {
      lastHeaderWidth = currentWidth;
      return;
    }
    lastHeaderWidth = currentWidth;

    const wasPopoverOpen = siteMenu.matches(":popover-open, .\\:popover-open");

    siteHeader.classList.add("is-measuring", "is-wide");
    siteMenu.removeAttribute("popover");

    const fitsInline = headerInner.scrollWidth <= headerInner.clientWidth;

    if (fitsInline) {
      siteHeader.classList.add("is-wide");
    } else {
      siteHeader.classList.remove("is-wide");
      siteMenu.setAttribute("popover", "auto");
      if (wasPopoverOpen && typeof siteMenu.showPopover === "function") {
        siteMenu.showPopover();
      }
    }

    requestAnimationFrame(() => {
      siteHeader.classList.remove("is-measuring");
    });
  };

  syncNavLayout();
  const observer = new ResizeObserver(syncNavLayout);
  observer.observe(siteHeader);
}
