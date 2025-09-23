// Simple overlay controller to manage show/hide and text bindings
export function createOverlayController({
  root,
  bindings = {},
  showClass = 'show',
  useAriaHidden = true
} = {}) {
  const element = typeof root === 'string' ? document.querySelector(root) : root;
  const bindingEntries = Object.entries(bindings).map(([key, config]) => {
    if (!element) {
      return { key, target: null, formatter: null };
    }
    const normalized = typeof config === 'string' ? { selector: config } : config;
    const target = normalized.selector ? element.querySelector(normalized.selector) : element;
    const formatter = normalized.formatter || null;
    return { key, target, formatter };
  });

  function applyBindings(data = {}) {
    bindingEntries.forEach(({ key, target, formatter }) => {
      if (!target) return;
      const value = data[key];
      const formatted = formatter ? formatter(value, data) : value;
      if (formatted !== undefined) {
        target.textContent = String(formatted);
      }
    });
  }

  function show(data = {}) {
    if (!element) return;
    applyBindings(data);
    element.classList.add(showClass);
    if (useAriaHidden) {
      element.setAttribute('aria-hidden', 'false');
    }
  }

  function hide() {
    if (!element) return;
    element.classList.remove(showClass);
    if (useAriaHidden) {
      element.setAttribute('aria-hidden', 'true');
    }
  }

  function update(data = {}) {
    if (!element) return;
    applyBindings(data);
  }

  function toggle(force) {
    if (!element) return;
    const shouldShow = typeof force === 'boolean' ? force : !element.classList.contains(showClass);
    if (shouldShow) {
      show();
    } else {
      hide();
    }
  }

  function isVisible() {
    return Boolean(element && element.classList.contains(showClass));
  }

  return {
    element,
    show,
    hide,
    update,
    toggle,
    isVisible
  };
}
