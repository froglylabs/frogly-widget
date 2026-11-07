// The core in a real browser (Chromium through Playwright).
//
// Cloud-only test: it runs in the Frogly cloud test environment through
// `npm run test:browser:cloud`, not on developer machines. Each run is
// recorded in docs/TESTING.md with the Playwright and Chromium versions. The
// normal `npm test` does not run this file, so it stays fast and needs no
// browser. Chromium is launched with its sandbox on.
//
// It serves a few host pages with the install line from a local address. The
// core is the real one with its real integrity value. A second copy with one
// byte changed is written to a temp folder and served under the same
// integrity value, so the browser must refuse it.
//
// The host pages are the shapes a shop page comes in: a footer with a list of
// links, a main with no footer, an app shell fixed to the viewport, and a
// single page app that redraws its footer after load.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { chromium } from "playwright";
import { hashes } from "../build.mjs";
import { CORE_SCRIPT, CORE_VERSION } from "../src/core.js";
import { fixtureCfgText, SITE_ID } from "./fixture-cfg.mjs";

const PORTAL_HOST = "assets.internal";
const CHECKIN = `https://${PORTAL_HOST}/v1/events`;
const CORE_FILE = `core.v${CORE_VERSION}.js`;
const LABELS = ["Staff", "Partners", "Status", "Docs", "Portal"];

/** The real core with one byte changed. BUDGET=50 becomes BUDGET=51. */
function tamperedCopy() {
  const needle = "var BUDGET=50;";
  const at = CORE_SCRIPT.indexOf(needle);
  assert.ok(at > 0, "the budget line is in the core");
  const changed = `${CORE_SCRIPT.slice(0, at)}var BUDGET=51;${CORE_SCRIPT.slice(at + needle.length)}`;
  assert.equal(Buffer.byteLength(changed), Buffer.byteLength(CORE_SCRIPT), "one byte changed, same length");
  assert.notEqual(hashes(changed).sri, hashes(CORE_SCRIPT).sri);
  return changed;
}

const HEAD = `<meta charset="utf-8"><title>Ada Shop</title>
<style>body{margin:0;font:16px/1.5 sans-serif}main{padding:24px}h1{margin:0 0 12px}form{margin:16px 0}</style>
<script>
window.__scriptErrors=[];
window.addEventListener("error",function(e){if(e.target&&e.target.tagName==="SCRIPT")window.__scriptErrors.push(e.target.src);},true);
</script>`;

const MAIN = `<main>
<h1 id="title">Ada Shop</h1>
<p id="intro">Hand made things, shipped the same day.</p>
<form id="contact" action="/contact" method="post"><label>Message <textarea name="message"></textarea></label><button>Send</button></form>
</main>`;

const FOOTER_LIST = `<footer id="foot" style="background:#222;color:#ddd;padding:32px 24px">
<p>Ada Shop, since 2019</p>
<ul class="links" style="list-style:none;margin:0;padding:0;display:flex;gap:18px">
<li class="item"><a class="quiet" href="/about" style="color:#9a9a9a;font-size:13px;text-decoration:underline">About</a></li>
<li class="item"><a class="quiet" href="/help" style="color:#9a9a9a;font-size:13px;text-decoration:underline">Help</a></li>
<li class="item"><a class="quiet" href="/terms" style="color:#9a9a9a;font-size:13px;text-decoration:underline">Terms</a></li>
</ul>
</footer>`;

/** One host page per shape. withScript false gives the same page without the install line. */
function hostPage(kind, origin, integrity, withScript) {
  const line = withScript
    ? `<script src="${origin}/w/${CORE_FILE}" data-cfg="${SITE_ID}" integrity="${integrity}" crossorigin="anonymous" async></script>`
    : "";
  let body;
  if (kind === "main-only") body = MAIN;
  if (kind === "footer-list") body = `<header><a href="/">Ada Shop</a></header>${MAIN}${FOOTER_LIST}`;
  if (kind === "shell") {
    body = `<div id="app" style="position:fixed;inset:0;overflow:auto"><header style="position:sticky;top:0;background:#fff">Ada</header>${MAIN}<div style="height:2000px"></div>${FOOTER_LIST}</div>`;
  }
  if (kind === "spa") {
    // The page's own script redraws the footer 400 ms after load, the way a router does on a route change.
    body = `${MAIN}${FOOTER_LIST}<script>window.__redraws=0;setTimeout(function(){var f=document.getElementById("foot");var n=f.cloneNode(false);n.innerHTML=f.innerHTML;f.parentNode.replaceChild(n,f);window.__redraws=1;},400);</script>`;
  }
  return `<!doctype html>\n<html lang="en"><head>${HEAD}</head><body>\n${body}\n${line}\n</body></html>`;
}

/** Positions of the host elements, the page height, and what the core added where. */
const MEASURE = `(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y + window.scrollY, r.width, r.height].map(Math.round); };
  const rect = (id) => box(document.getElementById(id));
  const main = document.querySelector("main");
  const footer = document.querySelector("footer");
  const extras = [...document.body.children].filter((el) => el !== main && el !== footer && el.tagName !== "SCRIPT" && el.id !== "app" && el.tagName !== "HEADER");
  const visible = extras.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0; });
  const offscreen = extras.filter((el) => el.getBoundingClientRect().right <= 0);
  const pair = [...document.querySelectorAll('a[data-keep="1"]')].filter((a) => a.getAttribute("aria-hidden") !== "true");
  const pick = (el) => { const s = getComputedStyle(el); return { fontSize: s.fontSize, color: s.color, textDecoration: s.textDecorationLine }; };
  const neighbour = pair[0] ? [...pair[0].parentElement.parentElement.querySelectorAll("a")].find((a) => a.getAttribute("data-keep") !== "1") : null;
  return {
    title: rect("title"), intro: rect("intro"), form: rect("contact"),
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    extras: extras.length,
    visible: visible.map((el) => ({ tag: el.tagName, links: [...el.querySelectorAll("a")].map((a) => a.textContent), height: el.getBoundingClientRect().height, ariaHidden: el.getAttribute("aria-hidden") })),
    offscreen: offscreen.map((el) => ({ tag: el.tagName, ariaHidden: el.getAttribute("aria-hidden"), tabindex: el.getAttribute("tabindex"), x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, display: getComputedStyle(el).display })),
    pair: pair.map((a) => ({ text: a.textContent, rel: a.getAttribute("rel"), parent: a.parentElement.tagName, parentClass: a.parentElement.className, grandparent: a.parentElement.parentElement.tagName, inFooter: footer ? footer.contains(a) : false, inMain: main ? main.contains(a) : false, box: box(a), style: pick(a) })),
    neighbour: neighbour ? { text: neighbour.textContent, box: box(neighbour), style: pick(neighbour) } : null,
    footer: footer ? box(footer) : null,
    main: main ? box(main) : null,
    listItems: footer ? [...footer.querySelectorAll("ul.links > li")].map((li) => li.className + ":" + li.textContent.trim()) : [],
    redraws: window.__redraws || 0,
    booted: window.__coreBoot === 1,
    scriptErrors: window.__scriptErrors,
  };
})()`;

describe("the core in Chromium", () => {
  let browser;
  let server;
  let origin;
  let tmp;
  let mode = "real";
  const integrity = hashes(CORE_SCRIPT).sri;

  before(async () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "core-browser-"));
    writeFileSync(path.join(tmp, "core.real.js"), CORE_SCRIPT);
    writeFileSync(path.join(tmp, "core.changed.js"), tamperedCopy());
    server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === `/w/${CORE_FILE}`) {
        const file = mode === "real" ? "core.real.js" : "core.changed.js";
        res.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" });
        res.end(readFileSync(path.join(tmp, file)));
        return;
      }
      if (url.pathname === `/cfg/${SITE_ID}.json`) {
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(fixtureCfgText({ portal_host: PORTAL_HOST }));
        return;
      }
      const page = url.pathname.replace(/^\//, "").replace(/\/plain$/, "") || "main-only";
      if (["main-only", "footer-list", "shell", "spa"].includes(page)) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(hostPage(page, origin, integrity, !url.pathname.endsWith("/plain")));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ chromiumSandbox: true });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  async function openPage(pathname) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    const page = await context.newPage();
    const events = [];
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.route(`https://${PORTAL_HOST}/**`, async (route) => {
      const request = route.request();
      events.push({ url: request.url(), body: request.postDataJSON() });
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await page.goto(`${origin}${pathname}`, { waitUntil: "load" });
    return { page, context, events, consoleErrors };
  }

  /** Opens the page with and without the script, waits for the core, and measures both. */
  async function compare(pathname, ready) {
    const plain = await openPage(`${pathname}/plain`);
    const before = await plain.page.evaluate(MEASURE);
    await plain.context.close();
    assert.equal(before.extras, 0);
    assert.equal(before.pair.length, 0);

    const live = await openPage(pathname);
    await live.page.waitForRequest((request) => request.url() === CHECKIN, { timeout: 5000 });
    await live.page.waitForFunction(ready, null, { timeout: 5000 });
    await live.page.waitForTimeout(400);
    const after = await live.page.evaluate(MEASURE);
    assert.equal(after.booted, true, "the real core ran");
    assert.deepEqual(after.scriptErrors, [], "no script error on the real core");
    assert.deepEqual(after.title, before.title, "the heading did not move");
    assert.deepEqual(after.intro, before.intro, "the paragraph did not move");
    assert.deepEqual(after.form, before.form, "the form did not move");
    assert.equal(after.width, before.width, "no horizontal scroll was added");
    assert.equal(after.offscreen.length, 1, "one hidden box");
    const box = after.offscreen[0];
    assert.equal(box.ariaHidden, "true");
    assert.equal(box.tabindex, "-1");
    assert.ok(box.x <= -9000, `the box sits off screen, x=${box.x}`);
    assert.ok(box.width <= 1 && box.height <= 1, "the box is one pixel");
    assert.notEqual(box.display, "none", "not display none, so a text extractor still reads it");
    assert.equal(after.visible.length, 0, "nothing visible was added to the body itself");
    assert.equal(await live.page.evaluate(() => document.cookie), "", "no cookie");
    return { before, after, live };
  }

  const hasPair = () => document.querySelectorAll('a[data-keep="1"]:not([aria-hidden])').length >= 2;
  const hasBox = () => document.body.querySelectorAll("div[data-keep][aria-hidden]").length >= 1;

  it("puts the two links in the footer's own list of links, dressed like their neighbours", async () => {
    mode = "real";
    const { before, after, live } = await compare("/footer-list", hasPair);
    assert.equal(after.pair.length, 2, "two small footer links");
    for (const link of after.pair) {
      assert.ok(LABELS.includes(link.text), link.text);
      assert.equal(link.rel, "nofollow");
      assert.equal(link.inFooter, true, "inside the footer");
      assert.equal(link.parent, "LI");
      assert.equal(link.parentClass, "item", "the new list item wears the neighbour's class");
      assert.equal(link.grandparent, "UL");
      assert.deepEqual(link.style, after.neighbour.style, "same size, colour, and underline as the link next to it");
      assert.ok(link.box[1] >= after.footer[1] && link.box[1] + link.box[3] <= after.footer[1] + after.footer[3], `inside the footer box: ${link.box} in ${after.footer}`);
      assert.equal(link.box[1], after.neighbour.box[1], "on the same line as the neighbour");
      assert.ok(link.box[0] > after.neighbour.box[0], "to the right of the page's own links");
    }
    assert.deepEqual(after.listItems.slice(0, 3), ["item:About", "item:Help", "item:Terms"], "the page's own items are untouched");
    assert.equal(after.listItems.length, 5);
    assert.equal(after.height, before.height, "the page did not grow: the links fit on the footer's own line");
    const checkIn = live.events.find((event) => event.url === CHECKIN && event.body && event.body.event_type === "check_in");
    assert.ok(checkIn, "one check-in went to the events address");
    assert.equal(checkIn.body.site_id, SITE_ID);
    assert.equal(checkIn.body.core_version, CORE_VERSION);
    await live.context.close();
  });

  it("puts the two links at the end of main when the page has no footer", async () => {
    mode = "real";
    const { before, after, live } = await compare("/main-only", hasPair);
    assert.equal(after.pair.length, 2);
    for (const link of after.pair) {
      assert.ok(LABELS.includes(link.text), link.text);
      assert.equal(link.inMain, true, "inside main");
      assert.equal(link.parent, "DIV");
      assert.equal(link.style.color, "rgb(0, 0, 0)", "the page's own text colour, not a hard coded grey");
      assert.ok(link.box[1] > after.form[1] + after.form[3], "below the form, at the end of main");
    }
    const grown = after.height - before.height;
    assert.ok(grown >= 0 && grown <= 48, `the page grew only by the small block: ${grown}px`);
    await live.context.close();
  });

  it("leaves the visible pair out on an app shell fixed to the viewport, and keeps the hidden set", async () => {
    mode = "real";
    const { after, live } = await compare("/shell", hasBox);
    assert.equal(after.pair.length, 0, "no visible link anywhere on the shell");
    assert.deepEqual(after.listItems, ["item:About", "item:Help", "item:Terms"], "the footer inside the shell is untouched");
    const hidden = await live.page.evaluate(() => document.body.querySelectorAll("div[data-keep][aria-hidden] a, div[data-keep][aria-hidden] form").length);
    assert.ok(hidden >= 3, "the hidden links and forms are still there");
    await live.context.close();
  });

  it("puts the pair back once when a single page app redraws its footer", async () => {
    mode = "real";
    const { after, live } = await compare("/spa", hasPair);
    assert.equal(after.pair.length, 2);
    await live.page.waitForFunction(() => window.__redraws === 1, null, { timeout: 5000 });
    await live.page.waitForFunction(hasPair, null, { timeout: 5000 });
    await live.page.waitForTimeout(800);
    const redrawn = await live.page.evaluate(MEASURE);
    assert.equal(redrawn.pair.length, 2, "exactly two, not four");
    assert.ok(redrawn.pair.every((link) => link.inFooter), "inside the new footer");
    assert.equal(redrawn.listItems.length, 5, "three of the page's own items and two added, once");
    assert.equal(redrawn.offscreen.length, 1, "still one hidden box");
    await live.context.close();
  });

  it("refuses a core with one byte changed under the real integrity value and runs nothing", async () => {
    mode = "changed";
    const live = await openPage("/footer-list");
    await live.page.waitForFunction(() => window.__scriptErrors.length > 0, null, { timeout: 5000 });
    await live.page.waitForTimeout(300);
    const after = await live.page.evaluate(MEASURE);

    assert.equal(after.scriptErrors.length, 1, "the script tag fired an error event");
    assert.ok(after.scriptErrors[0].endsWith(`/w/${CORE_FILE}`));
    assert.ok(live.consoleErrors.some((text) => /integrity/i.test(text)), `Chromium names the integrity failure: ${live.consoleErrors.join(" | ")}`);
    assert.equal(after.booted, false, "no core global");
    assert.equal(after.extras, 0, "nothing was added to the page");
    assert.equal(after.pair.length, 0);
    assert.deepEqual(live.events, [], "no events request");
    await live.context.close();
    mode = "real";
  });
});
