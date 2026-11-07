// A very small pretend browser for running the core in tests.
//
// It is not a real DOM. It records what the core builds, what it sends, and
// which document listeners it adds. The config is served from memory. Nothing
// here talks to the network.

import vm from "node:vm";

/** What getComputedStyle answers for a node that sets nothing of its own. */
const PLAIN_STYLE = {
  position: "static",
  overflow: "visible",
  overflowY: "visible",
  fontSize: "16px",
  color: "rgb(0, 0, 0)",
  textDecorationLine: "none",
  margin: "0px",
};

export function element(tag) {
  const node = {
    tag,
    tagName: String(tag).toUpperCase(),
    style: {},
    attrs: {},
    children: [],
    listeners: {},
    textContent: "",
    value: "",
    className: "",
    /** Pretend computed style. Tests set this on host nodes; the core only reads it. */
    computed: {},
    scrollHeight: 0,
    clientHeight: 0,
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      const at = this.children.indexOf(child);
      if (at >= 0) this.children.splice(at, 1);
      child.parentNode = null;
      return child;
    },
    contains(other) {
      let current = other;
      while (current) {
        if (current === this) return true;
        current = current.parentNode;
      }
      return false;
    },
    getElementsByTagName(name) {
      const wanted = String(name).toUpperCase();
      const found = [];
      allNodes(this).forEach((child) => {
        if (child.tagName === wanted) found.push(child);
      });
      return found;
    },
    addEventListener(type, fn) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(fn);
    },
    querySelectorAll() {
      const found = [];
      const walk = (current) => {
        for (const child of current.children) {
          if (child.tag === "input" || child.tag === "textarea" || child.tag === "select") found.push(child);
          walk(child);
        }
      };
      walk(this);
      return found;
    },
  };
  // Not enumerable, so a test can still JSON.stringify a node without going round in circles.
  Object.defineProperty(node, "parentNode", { value: null, writable: true, enumerable: false });
  Object.defineProperty(node, "childNodes", {
    get() {
      return this.children;
    },
  });
  return node;
}

/** Builds a small host page part: tag, attributes, and children or text. */
export function html(tag, attrs = {}, children = []) {
  const node = element(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "class") node.className = value;
    else if (name === "computed") Object.assign(node.computed, value);
    else if (name === "scrollHeight" || name === "clientHeight") node[name] = value;
    else node.setAttribute(name, value);
  }
  if (typeof children === "string") node.textContent = children;
  else for (const child of children) node.appendChild(child);
  return node;
}

/** Turns the pretend body into HTML text, the way a text extractor would see it. */
export function toHtml(node) {
  if (node.tag === "#comment") return `<!--${node.textContent}-->`;
  const attrs = Object.entries(node.attrs)
    .map(([name, value]) => ` ${name}="${String(value).replace(/"/g, "&quot;")}"`)
    .join("");
  const cls = node.className ? ` class="${node.className}"` : "";
  const style = node.style && node.style.cssText ? ` style="${node.style.cssText}"` : "";
  const inner = node.children.map(toHtml).join("") + (node.textContent || "");
  return `<${node.tag}${attrs}${cls}${style}>${inner}</${node.tag}>`;
}

/** Everything the core built, flattened. */
export function allNodes(node, out = []) {
  for (const child of node.children) {
    out.push(child);
    allNodes(child, out);
  }
  return out;
}

/** The two visible links the core adds: data-keep, not hidden. */
export function visiblePair(body) {
  return allNodes(body).filter((node) => node.tag === "a" && node.attrs["data-keep"] === "1" && node.attrs["aria-hidden"] !== "true");
}

/**
 * Runs the core script.
 *
 * options.siteId   the site id in data-cfg
 * options.cfgText  the config JSON text the pretend fetch returns
 * options.cfgStatus  HTTP status for the config, default 200
 * options.events   what the pretend events endpoint answers, default { ok: true }.
 *                  An Error makes the request fail; the string "hang" makes it never answer.
 * options.now      a clock function
 * options.webdriver  whether navigator.webdriver is true
 * options.storage  a Map used as sessionStorage
 * options.seed     a function that fills the body before the core runs
 * options.pathname the page path, default /contact
 * options.scriptSrc  the src of the script tag, default the core address
 * options.dataCfg  the data-cfg attribute on the tag; null means the tag has none,
 *                  as on the older /w/SITE_ID.js?v=2 line. Default is siteId.
 * options.currentScript  false to pretend document.currentScript is missing
 */
export function runCore(script, options = {}) {
  const siteId = options.siteId || "33333333-3333-4333-8333-333333333333";
  const dataCfg = options.dataCfg === undefined ? siteId : options.dataCfg;
  const calls = [];
  const cfgFetches = [];
  const cookieWrites = [];
  const intervals = [];
  const timeouts = [];
  const observers = [];
  const storage = options.storage || new Map();
  const body = element("body");
  if (options.seed) options.seed(body);
  const documentListeners = [];
  const currentScript = {
    src: options.scriptSrc || "https://cdn.example/w/core.v4.js",
    getAttribute(name) {
      return name === "data-cfg" ? dataCfg : null;
    },
  };
  const document = {
    readyState: "complete",
    body,
    currentScript: options.currentScript === false ? null : currentScript,
    createElement: element,
    getElementsByTagName(name) {
      if (String(name).toLowerCase() === "script") return [currentScript];
      return body.getElementsByTagName(name);
    },
    createComment(text) {
      const node = element("#comment");
      node.textContent = text;
      return node;
    },
    addEventListener(type, fn) {
      documentListeners.push({ type, fn });
    },
  };
  let cookie = "";
  Object.defineProperty(document, "cookie", {
    get() {
      return cookie;
    },
    set(value) {
      cookieWrites.push(String(value));
      cookie = String(value);
    },
  });
  class MutationObserver {
    constructor(fn) {
      this.fn = fn;
    }
    observe(target, init) {
      observers.push({ fn: this.fn, target, init });
    }
  }
  const sandbox = {
    window: {
      getComputedStyle(node) {
        return { ...PLAIN_STYLE, ...(node && node.computed) };
      },
      MutationObserver,
    },
    MutationObserver,
    document,
    navigator: { webdriver: options.webdriver === true },
    location: { pathname: options.pathname || "/contact" },
    sessionStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    },
    crypto: globalThis.crypto,
    URL,
    encodeURIComponent,
    setInterval(fn, ms) {
      intervals.push({ fn, ms });
      return intervals.length;
    },
    setTimeout(fn, ms) {
      timeouts.push({ fn, ms });
      return timeouts.length;
    },
    Date: options.now ? { now: options.now } : Date,
    fetch(url, init) {
      const text = String(url);
      if (text.includes("/cfg/")) {
        cfgFetches.push(text);
        const status = options.cfgStatus ?? 200;
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          text: () => Promise.resolve(options.cfgText ?? ""),
        });
      }
      calls.push({ url: text, body: init && init.body ? JSON.parse(init.body) : null, init });
      const answer = options.events ?? { ok: true };
      if (answer === "hang") return new Promise(() => {});
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    },
  };
  vm.runInNewContext(script, sandbox, { timeout: 2000 });
  return {
    calls,
    cfgFetches,
    body,
    documentListeners,
    cookieWrites,
    storage,
    intervals,
    timeouts,
    observers,
    listener(type) {
      return documentListeners.find((entry) => entry.type === type)?.fn;
    },
    /** Tells every observer the page changed, then runs the timers that queued. */
    mutate() {
      for (const observer of observers) observer.fn([], observer);
      const due = timeouts.splice(0, timeouts.length);
      for (const timer of due) timer.fn();
    },
    async settle() {
      for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}
