import { Z as attr_class, _ as clsx, $ as ensure_array_like, a0 as store_get, a1 as unsubscribe_stores, a2 as bind_props, a3 as slot } from "../../chunks/index2.js";
import { w as writable } from "../../chunks/index.js";
import { e as escape_html, f as fallback } from "../../chunks/context.js";
function createToastStore() {
  const { subscribe, update } = writable([]);
  return {
    subscribe,
    add: (toast2) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { id, ...toast2 };
      update((toasts2) => [...toasts2, newToast]);
      if (toast2.duration !== 0) {
        setTimeout(() => {
          update((toasts2) => toasts2.filter((t) => t.id !== id));
        }, toast2.duration || 3e3);
      }
      return id;
    },
    remove: (id) => {
      update((toasts2) => toasts2.filter((t) => t.id !== id));
    },
    clear: () => {
      update(() => []);
    }
  };
}
const toasts = createToastStore();
function Toast($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let containerClasses;
    let position = fallback($$props["position"], "top-right");
    function getIcon(type) {
      switch (type) {
        case "success":
          return "✓";
        case "error":
          return "✕";
        case "warning":
          return "⚠";
        case "info":
          return "ℹ";
        default:
          return "";
      }
    }
    function getToastClasses(type) {
      return ["cds-toast", type !== "default" ? `cds-toast--${type}` : ""].filter(Boolean).join(" ");
    }
    containerClasses = ["cds-toast-container", `cds-toast-container--${position}`].join(" ");
    $$renderer2.push(`<div${attr_class(clsx(containerClasses))}><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$toasts", toasts));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let toast = each_array[$$index];
      $$renderer2.push(`<div${attr_class(clsx(getToastClasses(toast.type)))}>`);
      if (toast.type !== "default") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="cds-toast__icon">${escape_html(getIcon(toast.type))}</div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="cds-toast__content">`);
      if (toast.title) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="cds-toast__title">${escape_html(toast.title)}</div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="cds-toast__message">${escape_html(toast.message)}</div></div> <button class="cds-toast__close" aria-label="Close">✕</button></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { position });
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="cds-h-screen" style="background: var(--cds-color-background);"><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div> `);
    Toast($$renderer2, { position: "top-right" });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _layout as default
};
