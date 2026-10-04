/**
 * L'AMOUR BOOKSTORE - UNIVERSAL CUSTOM FLOATING DROPDOWN ENGINE
 * Enterprise-grade custom select replacement with two-way data binding,
 * DOM mutation observation, smart auto-placement & multi-theme support.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UniversalDropdown = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class UniversalDropdown {
    static instances = new Map();

    /**
     * Attach a custom floating dropdown to a <select> element
     * @param {HTMLSelectElement|string} selectEl 
     * @param {Object} options 
     */
    static attach(selectEl, options = {}) {
      if (!selectEl) return null;
      if (typeof selectEl === 'string') selectEl = document.querySelector(selectEl);
      if (!selectEl || selectEl.tagName !== 'SELECT') return null;

      if (this.instances.has(selectEl)) {
        const existing = this.instances.get(selectEl);
        existing.updateOptions(options);
        return existing;
      }

      const instance = new UniversalDropdown(selectEl, options);
      this.instances.set(selectEl, instance);
      return instance;
    }

    /**
     * Automatically attach custom dropdowns to all matching selects
     * @param {string} selector 
     * @param {HTMLElement} root 
     * @param {Object} options 
     */
    static attachAll(selector = 'select:not([data-no-custom])', root = document, options = {}) {
      if (!root || !root.querySelectorAll) root = document;
      const list = root.querySelectorAll(selector);
      const attached = [];
      list.forEach(el => {
        const inst = UniversalDropdown.attach(el, options);
        if (inst) attached.push(inst);
      });
      return attached;
    }

    /**
     * Synchronize a select element's custom dropdown with its current native state
     * @param {HTMLSelectElement|string} selectEl 
     */
    static sync(selectEl) {
      if (typeof selectEl === 'string') selectEl = document.querySelector(selectEl);
      if (selectEl && this.instances.has(selectEl)) {
        this.instances.get(selectEl).sync();
      }
    }

    /**
     * Close all active dropdown popups
     * @param {UniversalDropdown} exceptInstance 
     */
    static closeAll(exceptInstance = null) {
      UniversalDropdown.instances.forEach(inst => {
        if (inst !== exceptInstance && inst.isOpen) {
          inst.close();
        }
      });
    }

    constructor(selectEl, opts = {}) {
      this.select = selectEl;
      this.opts = opts || {};
      this.isOpen = false;
      this.init();
    }

    updateOptions(newOpts) {
      if (newOpts) Object.assign(this.opts, newOpts);
      this.applyStyling();
      this.sync();
    }

    init() {
      // 1. Hide native select from standard view while keeping it intact for FormData & events
      this.select.style.display = 'none';
      this.select.setAttribute('aria-hidden', 'true');
      this.select.setAttribute('tabindex', '-1');

      // 2. Create custom wrapper
      this.wrap = document.createElement('div');
      this.wrap.className = 'cr-custom-select-wrap';

      // Check compact mode
      const isCompact = this.opts.compact || 
                        this.select.classList.contains('compact') || 
                        this.select.dataset.compact === 'true' ||
                        (this.select.id && this.select.id.startsWith('crReasonSelect_'));
      if (isCompact) {
        this.wrap.classList.add('compact');
      }

      // Check dark theme
      const isDark = this.opts.theme === 'dark' || 
                     this.select.dataset.theme === 'dark' || 
                     this.select.classList.contains('theme-dark') ||
                     (document.body && document.body.classList.contains('dark-theme')) ||
                     document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        this.wrap.classList.add('theme-dark');
      }

      // Check disabled state
      if (this.select.disabled) {
        this.wrap.classList.add('disabled');
      }

      // Check align right
      const isAlignRight = this.opts.align === 'right' || 
                           this.select.dataset.align === 'right' || 
                           this.select.classList.contains('align-right');
      if (isAlignRight) {
        this.wrap.classList.add('align-right');
      }

      // Apply geometry & styling
      this.applyStyling();

      // 3. Trigger button
      this.trigger = document.createElement('div');
      this.trigger.className = 'cr-custom-select-trigger';
      this.trigger.tabIndex = this.select.disabled ? -1 : 0;
      this.trigger.setAttribute('role', 'combobox');
      this.trigger.setAttribute('aria-expanded', 'false');
      if (this.select.disabled) {
        this.trigger.setAttribute('aria-disabled', 'true');
      }

      this.label = document.createElement('span');
      this.label.className = 'cr-custom-trigger-label';

      this.arrow = document.createElement('span');
      this.arrow.className = 'cr-select-arrow';
      this.arrow.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

      this.trigger.appendChild(this.label);
      this.trigger.appendChild(this.arrow);

      // 4. Floating options menu
      this.menu = document.createElement('div');
      this.menu.className = 'cr-custom-select-options';
      this.menu.setAttribute('role', 'listbox');

      this.wrap.appendChild(this.trigger);
      this.wrap.appendChild(this.menu);

      // 5. Insert directly next to the original <select>
      if (this.select.nextSibling) {
        this.select.parentNode.insertBefore(this.wrap, this.select.nextSibling);
      } else {
        this.select.parentNode.appendChild(this.wrap);
      }

      // 6. Initial render of options
      this.renderOptions();

      // 7. Event listeners
      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.select.disabled) return;
        this.toggle();
      });

      this.trigger.addEventListener('keydown', (e) => {
        if (this.select.disabled) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.open();
        } else if (e.key === 'Escape') {
          this.close();
        }
      });

      // Listen to change event fired on native select
      this.select.addEventListener('change', () => {
        this.updateSelectionVisuals();
      });

      // 8. Intercept select.value setter so programmatic changes immediately reflect in the custom UI
      if (!this.select._hasCustomValInterceptor) {
        this.select._hasCustomValInterceptor = true;
        const proto = HTMLSelectElement.prototype;
        const descVal = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descVal) {
          const self = this;
          Object.defineProperty(this.select, 'value', {
            get() { return descVal.get.call(this); },
            set(v) {
              descVal.set.call(this, v);
              self.updateSelectionVisuals();
            },
            configurable: true
          });
        }

        const descDisabled = Object.getOwnPropertyDescriptor(proto, 'disabled');
        if (descDisabled) {
          const self = this;
          Object.defineProperty(this.select, 'disabled', {
            get() { return descDisabled.get.call(this); },
            set(d) {
              descDisabled.set.call(this, d);
              self.updateDisabledVisuals(d);
            },
            configurable: true
          });
        }
      }

      // 9. MutationObserver for dynamic option additions/removals and attribute updates
      this.observer = new MutationObserver((mutations) => {
        let shouldRender = false;
        mutations.forEach(m => {
          if (m.type === 'childList') shouldRender = true;
          if (m.type === 'attributes' && m.attributeName === 'disabled') {
            this.updateDisabledVisuals(this.select.disabled);
          }
        });
        if (shouldRender) {
          this.renderOptions();
        }
      });
      this.observer.observe(this.select, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['disabled', 'class'] 
      });
    }

    applyStyling() {
      if (this.opts.width) this.wrap.style.width = this.opts.width;
      else if (this.select.style.width) this.wrap.style.width = this.select.style.width;

      if (this.opts.minWidth) this.wrap.style.minWidth = this.opts.minWidth;
      else if (this.select.style.minWidth) this.wrap.style.minWidth = this.select.style.minWidth;

      if (this.opts.maxWidth) this.wrap.style.maxWidth = this.opts.maxWidth;
      else if (this.select.style.maxWidth) this.wrap.style.maxWidth = this.select.style.maxWidth;

      if (this.opts.flex) this.wrap.style.flex = this.opts.flex;
      else if (this.select.style.flex) this.wrap.style.flex = this.select.style.flex;
    }

    updateDisabledVisuals(isDisabled) {
      if (isDisabled) {
        this.wrap.classList.add('disabled');
        this.trigger.tabIndex = -1;
        this.trigger.setAttribute('aria-disabled', 'true');
        this.close();
      } else {
        this.wrap.classList.remove('disabled');
        this.trigger.tabIndex = 0;
        this.trigger.removeAttribute('aria-disabled');
      }
    }

    renderOptions() {
      this.menu.innerHTML = '';
      const options = Array.from(this.select.options || []);

      const curIdx = this.select.selectedIndex >= 0 ? this.select.selectedIndex : 0;
      const selectedOpt = options[curIdx] || options[0];
      const optText = selectedOpt ? selectedOpt.textContent : '-- Chọn --';
      this.label.textContent = optText;
      this.label.title = optText;
      this.trigger.title = optText;

      options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'cr-custom-option' + (opt.selected ? ' active' : '');
        item.setAttribute('data-val', opt.value);
        item.setAttribute('role', 'option');

        const spanText = document.createElement('span');
        spanText.textContent = opt.textContent;

        const check = document.createElement('span');
        check.className = 'cr-opt-check';
        check.textContent = '✓';

        item.appendChild(spanText);
        item.appendChild(check);

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.select.disabled) return;
          this.choose(opt.value);
        });

        this.menu.appendChild(item);
      });
    }

    updateSelectionVisuals() {
      const val = this.select.value;
      const options = Array.from(this.select.options || []);
      const curIdx = this.select.selectedIndex;
      const selectedOpt = curIdx >= 0 ? options[curIdx] : options.find(o => o.value === val);
      const optText = selectedOpt ? selectedOpt.textContent : (options[0]?.textContent || '-- Chọn --');
      this.label.textContent = optText;
      this.label.title = optText;
      this.trigger.title = optText;

      this.menu.querySelectorAll('.cr-custom-option').forEach(item => {
        const isMatch = item.getAttribute('data-val') === val;
        item.classList.toggle('active', isMatch);
      });
    }

    choose(val) {
      if (this.select.value !== val) {
        this.select.value = val;
        this.select.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof this.select.onchange === 'function') {
          this.select.onchange();
        }
      }
      this.updateSelectionVisuals();
      this.close();
    }

    toggle() {
      if (this.select.disabled) return;
      if (this.isOpen) this.close();
      else this.open();
    }

    open() {
      if (this.select.disabled) return;
      UniversalDropdown.closeAll(this);

      this.isOpen = true;
      this.wrap.classList.add('open');
      this.trigger.setAttribute('aria-expanded', 'true');

      // Smart position: dropup if near bottom of viewport
      const rect = this.trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > 250) {
        this.wrap.classList.add('dropup');
      } else {
        this.wrap.classList.remove('dropup');
      }

      // Smart position: align right if near right edge of viewport or modal/container
      let shouldAlignRight = false;
      if (this.opts.align === 'right' || 
          this.select.dataset.align === 'right' || 
          this.select.classList.contains('align-right') || 
          this.wrap.classList.contains('align-right')) {
        shouldAlignRight = true;
      } else {
        const estimatedWidth = Math.max(this.menu.offsetWidth || 0, 300);
        // 1. Check viewport right boundary
        if (rect.left + estimatedWidth > window.innerWidth - 12) {
          shouldAlignRight = true;
        } else {
          // 2. Check nearest modal or scroll/boundary container
          const container = this.wrap.closest('.modal-content, .modal-card, .modal-box, .modal-dialog, .drawer-content, [role="dialog"], .modal') ||
                            this.getScrollParent(this.wrap);
          if (container && container !== document.body && container !== document.documentElement) {
            const cRect = container.getBoundingClientRect();
            // If opening towards right would exceed container's right boundary
            if (rect.left + estimatedWidth > cRect.right - 14) {
              shouldAlignRight = true;
            }
          }
        }
      }

      if (shouldAlignRight) {
        this.wrap.classList.add('align-right');
        this.menu.classList.add('align-right');
      } else {
        this.wrap.classList.remove('align-right');
        this.menu.classList.remove('align-right');
      }

      // Scroll active item into view safely within this.menu ONLY (never cause modal/window horizontal scroll)
      const activeItem = this.menu.querySelector('.cr-custom-option.active');
      if (activeItem) {
        setTimeout(() => {
          const menuTop = this.menu.scrollTop;
          const itemTop = activeItem.offsetTop;
          const itemBottom = itemTop + activeItem.offsetHeight;
          const menuHeight = this.menu.clientHeight;

          if (itemTop < menuTop) {
            this.menu.scrollTop = itemTop;
          } else if (itemBottom > menuTop + menuHeight) {
            this.menu.scrollTop = itemBottom - menuHeight;
          }
        }, 30);
      }
    }

    getScrollParent(node = this.wrap) {
      if (!node) return null;
      let parent = node.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const style = window.getComputedStyle(parent);
        const overflow = (style.overflow || '') + (style.overflowX || '') + (style.overflowY || '');
        if (/auto|scroll|hidden/.test(overflow)) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    }

    close() {
      this.isOpen = false;
      this.wrap.classList.remove('open');
      this.trigger.setAttribute('aria-expanded', 'false');
    }

    sync() {
      this.renderOptions();
      this.updateSelectionVisuals();
      this.updateDisabledVisuals(this.select.disabled);
    }

    destroy() {
      if (this.observer) this.observer.disconnect();
      if (this.wrap && this.wrap.parentNode) {
        this.wrap.parentNode.removeChild(this.wrap);
      }
      this.select.style.display = '';
      this.select.removeAttribute('aria-hidden');
      this.select.removeAttribute('tabindex');
      UniversalDropdown.instances.delete(this.select);
    }
  }

  // Global document click listener to close all open dropdowns
  document.addEventListener('click', (e) => {
    UniversalDropdown.instances.forEach(inst => {
      if (inst.isOpen && !inst.wrap.contains(e.target)) {
        inst.close();
      }
    });
  });

  // Global Escape listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UniversalDropdown.closeAll();
    }
  });

  return UniversalDropdown;
}));
