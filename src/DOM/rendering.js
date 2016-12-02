import { NO_OP, isBrowser, isInvalid, isNull, isNullOrUndef, throwError, } from '../shared';
import { devToolsStatus, sendRoots, } from './devtools';
import Lifecycle from './lifecycle';
import cloneVNode from '../factories/cloneVNode';
import hydrateRoot from './hydration';
import { mount } from './mounting';
import { patch } from './patching';
import { unmount } from './unmounting';
// rather than use a Map, like we did before, we can use an array here
// given there shouldn't be THAT many roots on the page, the difference
// in performance is huge: https://esbench.com/bench/5802a691330ab09900a1a2da
export const roots = [];
export const componentToDOMNodeMap = new Map();
function isElement(obj) {
    try {
        // Using W3 DOM2 (works for FF, Opera and Chrom)
        return obj instanceof HTMLElement;
    }
    catch (e) {
        // Browsers not supporting W3 DOM2 don't have HTMLElement and
        // an exception is thrown and we end up here. Testing some
        // properties that all elements have. (works on IE7)
        return (typeof obj === "object") &&
            (obj.nodeType === 1) && (typeof obj.style === "object") &&
            (typeof obj.ownerDocument === "object");
    }
}
export function findDOMNode(domNode) {
    return componentToDOMNodeMap.get(domNode) || (isElement(domNode) ? domNode : null);
}
function getRoot(dom) {
    for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (root.dom === dom) {
            return root;
        }
    }
    return null;
}
function setRoot(dom, input, lifecycle) {
    roots.push({
        dom,
        input,
        lifecycle
    });
}
function removeRoot(root) {
    for (let i = 0; i < roots.length; i++) {
        if (roots[i] === root) {
            roots.splice(i, 1);
            return;
        }
    }
}
const documentBody = isBrowser ? document.body : null;
export function render(input, parentDom) {
    if (documentBody === parentDom) {
        if (process.env.NODE_ENV !== 'production') {
            throwError('you cannot render() to the "document.body". Use an empty element as a container instead.');
        }
        throwError();
    }
    if (input === NO_OP) {
        return;
    }
    const root = getRoot(parentDom);
    if (isNull(root)) {
        const lifecycle = new Lifecycle();
        if (!isInvalid(input)) {
            if (input.dom) {
                input = cloneVNode(input);
            }
            if (!hydrateRoot(input, parentDom, lifecycle)) {
                mount(input, parentDom, lifecycle, {}, false);
            }
            lifecycle.trigger();
            setRoot(parentDom, input, lifecycle);
        }
    }
    else {
        const lifecycle = root.lifecycle;
        lifecycle.listeners = [];
        if (isNullOrUndef(input)) {
            unmount(root.input, parentDom, lifecycle, false, false, false);
            removeRoot(root);
        }
        else {
            if (input.dom) {
                input = cloneVNode(input);
            }
            patch(root.input, input, parentDom, lifecycle, {}, false, false);
        }
        lifecycle.trigger();
        root.input = input;
    }
    if (devToolsStatus.connected) {
        sendRoots(window);
    }
}
export function createRenderer() {
    let parentDom;
    return function renderer(lastInput, nextInput) {
        if (!parentDom) {
            parentDom = lastInput;
        }
        render(nextInput, parentDom);
    };
}
//# sourceMappingURL=rendering.js.map