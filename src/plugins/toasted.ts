import type { App } from 'vue';

// Vue 3 replacement for the removed `vue-toasted` plugin. Exposes the same
// `this.$toasted.show(message, options)` API the app already calls (~11 sites:
// permission/share updates, user account flows, artefact-editor feedback), so
// those calls stop throwing `Cannot read properties of undefined (reading 'show')`
// and once again surface user feedback. Self-contained (no new dependency),
// styled with the bootstrap classes the app already ships.

type ToastType = 'info' | 'success' | 'error' | 'warning' | string;

interface ToastOptions {
    type?: ToastType;
    // vue-toasted positions, e.g. 'top-right', 'bottom-left', 'top-center'.
    position?: string;
    // Auto-dismiss after N ms. 0 / undefined keeps the previous 4s default.
    duration?: number;
    [key: string]: unknown;
}

const VARIANT: Record<string, string> = {
    info: 'text-bg-info',
    success: 'text-bg-success',
    error: 'text-bg-danger',
    warning: 'text-bg-warning',
};

// One container per (corner) position, created on demand.
const containers = new Map<string, HTMLElement>();

function positionStyle(position: string): Partial<CSSStyleDeclaration> {
    const [v = 'top', h = 'right'] = position.split('-');
    const style: Partial<CSSStyleDeclaration> = {
        position: 'fixed',
        zIndex: '2000',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '1rem',
        pointerEvents: 'none',
    };
    style[v === 'bottom' ? 'bottom' : 'top'] = '0';
    if (h === 'center') {
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        style.alignItems = 'center';
    } else {
        style[h === 'left' ? 'left' : 'right'] = '0';
        style.alignItems = h === 'left' ? 'flex-start' : 'flex-end';
    }
    return style;
}

function containerFor(position: string): HTMLElement {
    let el = containers.get(position);
    if (!el) {
        el = document.createElement('div');
        Object.assign(el.style, positionStyle(position));
        document.body.appendChild(el);
        containers.set(position, el);
    }
    return el;
}

function show(message: string, options: ToastOptions = {}): void {
    if (typeof document === 'undefined') {
        return;
    }
    const position = options.position || 'top-right';
    const duration = typeof options.duration === 'number' ? options.duration : 4000;
    const variant = VARIANT[options.type ?? 'info'] || VARIANT.info;

    const toast = document.createElement('div');
    toast.className = `toast-shim ${variant} shadow-sm rounded px-3 py-2`;
    toast.setAttribute('role', 'alert');
    Object.assign(toast.style, {
        pointerEvents: 'auto',
        maxWidth: '350px',
        opacity: '0',
        transition: 'opacity 150ms ease',
    } as Partial<CSSStyleDeclaration>);
    toast.textContent = message;

    const container = containerFor(position);
    container.appendChild(toast);
    // Fade in on next frame.
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    const remove = () => {
        toast.style.opacity = '0';
        window.setTimeout(() => {
            toast.remove();
            const c = containers.get(position);
            if (c && c.childElementCount === 0) {
                c.remove();
                containers.delete(position);
            }
        }, 150);
    };

    toast.addEventListener('click', remove);
    if (duration > 0) {
        window.setTimeout(remove, duration);
    }
}

export default {
    install(app: App): void {
        app.config.globalProperties.$toasted = { show };
    },
};
