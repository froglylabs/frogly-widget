// The core in a real browser (Chromium through Playwright).
//
// Cloud-only test: it runs in the Frogly cloud test environment through
// `npm run test:browser:cloud`, not on developer machines. Each run is
// recorded in docs/TESTING.md with the Playwright and Chromium versions. The
// normal `npm test` does not run this file, so it stays fast and needs no
// browser. Chromium is launched with its sandbox on.
//
// It serves a page with the install line from a local address. The core is
// the real one with its real integrity value. A second copy with one byte
// changed is written to a temp folder and served under the same integrity
// value, so the browser must refuse it.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { chromium } from "playwright";
import { hashes } from "../build.mjs";
import { CORE_SCRIPT } from "../src/core.js";
import { fixtureCfgText, SITE_ID } from "./fixture-cfg.mjs";

const PORTAL_HOST = "assets.internal";
const CHECKIN = `https://${PORTAL_HOST}/v1/events`;

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

function hostPage(origin, integrity, withScript) {
  const line = withScript
    ? `<script src="${origin}/w/core.v3.js" data-cfg="${SITE_ID}" integrity="${integrity}" crossorigin="anonymous" async></script>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Ada Shop</title>
<style>body{margin:0;font:16px/1.5 sans-serif}main{padding:24px}h1{margin:0 0 12px}form{margin:16px 0}</style>
<script>
window.__scriptErrors=[];
window.addEventListener("error",function(e){if(e.target&&e.target.tagName==="SCRIPT")window.__scriptErrors.push(e.target.src);},true);
</script>
</head><body>
<main>
<h1 id="title">Ada Shop</h1>
<p id="intro">Hand made things, shipped the same day.</p>
<form id="contact" action="/contact" method="post"><label>Message <textarea name="message"></textarea></label><button>Send</button></form>
</main>
${line}
</body></html>`;
}

/** Positions of the host elements, the page height, and what else is visible. */
const MEASURE = `(() => {
  const rect = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
  const main = document.querySelector("main");
  const extras = [...document.body.children].filter((el) => el !== main && el.tagName !== "SCRIPT");
  const visible = extras.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0; });
  const offscreen = extras.filter((el) => el.getBoundingClientRect().right <= 0);
  return {
    title: rect("title"), intro: rect("intro"), form: rect("contact"),
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
    extras: extras.length,
    visible: visible.map((el) => ({ tag: el.tagName, links: [...el.querySelectorAll("a")].map((a) => a.textContent), height: el.getBoundingClientRect().height, ariaHidden: el.getAttribute("aria-hidden") })),
    offscreen: offscreen.map((el) => ({ tag: el.tagName, ariaHidden: el.getAttribute("aria-hidden"), tabindex: el.getAttribute("tabindex"), x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, display: getComputedStyle(el).display })),
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
      if (url.pathname === "/w/core.v3.js") {
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
      if (url.pathname === "/" || url.pathname === "/plain") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(hostPage(origin, integrity, url.pathname === "/"));
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

  it("leaves the host content where it was, keeps the hidden box off screen, and shows only the two footer links", async () => {
    mode = "real";
    const plain = await openPage("/plain");
    const before = await plain.page.evaluate(MEASURE);
    await plain.context.close();
    assert.equal(before.extras, 0);

    const live = await openPage("/");
    await live.page.waitForRequest((request) => request.url() === CHECKIN, { timeout: 5000 });
    await live.page.waitForFunction(() => document.body.querySelectorAll("div[data-keep]").length >= 2, null, { timeout: 5000 });
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

    assert.equal(after.visible.length, 1, "the footer row is the only visible addition");
    const footer = after.visible[0];
    assert.equal(footer.links.length, 2, "two small footer links");
    assert.equal(footer.ariaHidden, null, "the footer row is not hidden from assistive tech");
    assert.ok(footer.links.every((word) => ["Staff", "Partners", "Status", "Docs", "Portal"].includes(word)), footer.links.join(","));
    const grown = after.height - before.height;
    assert.ok(grown >= 0 && grown <= Math.ceil(footer.height) + 24, `the page grew only by the footer row: ${grown}px`);

    const checkIn = live.events.find((event) => event.url === CHECKIN && event.body && event.body.event_type === "check_in");
    assert.ok(checkIn, "one check-in went to the events address");
    assert.equal(checkIn.body.site_id, SITE_ID);
    assert.equal(await live.page.evaluate(() => document.cookie), "", "no cookie");
    await live.context.close();
  });

  it("refuses a core with one byte changed under the real integrity value and runs nothing", async () => {
    mode = "changed";
    const live = await openPage("/");
    await live.page.waitForFunction(() => window.__scriptErrors.length > 0, null, { timeout: 5000 });
    await live.page.waitForTimeout(300);
    const after = await live.page.evaluate(MEASURE);

    assert.equal(after.scriptErrors.length, 1, "the script tag fired an error event");
    assert.ok(after.scriptErrors[0].endsWith("/w/core.v3.js"));
    assert.ok(live.consoleErrors.some((text) => /integrity/i.test(text)), `Chromium names the integrity failure: ${live.consoleErrors.join(" | ")}`);
    assert.equal(after.booted, false, "no core global");
    assert.equal(after.extras, 0, "nothing was added to the page");
    assert.deepEqual(live.events, [], "no events request");
    await live.context.close();
    mode = "real";
  });
});
