# Frogly widget core

This is the one static script a website loads for Frogly. The same bytes go to every site. Nothing in the file names a site or a host. This page is for a developer who wants to read what the script does before putting it on a page.

The script is in `src/core.js`. The build writes it to `dist/core.v4.js` and prints its SHA-256 and its SRI value. Those two values are also listed in `docs/INTEGRITY.md`, and a test fails when they drift.

The server side of Frogly (the API that receives events, the config each site is served, the hidden addresses, and the console) is closed source and is not in this repository. This repository is a copy of the `packages/widget` folder of Frogly's private repository, exported with a script; changes are made there and exported here.

## The line a site pastes

```html
<script src="https://cdn.frogly.ai/w/core.v4.js" data-cfg="SITE_ID" integrity="sha384-cxX6VlSnJbFCRk+9A4zNICeJhYmmoHOLlHP0vqr5CuS5NrQhiWWOIPL6XKI5Cw+Q" crossorigin="anonymous" async></script>
```

`data-cfg` is the site id. The script reads it from its own tag, then loads `https://cdn.frogly.ai/cfg/SITE_ID.json` from the same host as itself. The `integrity` value is the SRI hash of the served file: if one byte of the file differs from what that value names, the browser refuses to run it. The current values are:

- Size: 15088 bytes
- sha256: `1b56a92e09febdd1207d9fabaa8a2b6fc76da048e58c8b1bf1b58b734f9dd006`
- SRI: `sha384-cxX6VlSnJbFCRk+9A4zNICeJhYmmoHOLlHP0vqr5CuS5NrQhiWWOIPL6XKI5Cw+Q`

## Verify the hash yourself

Three checks from your own computer. The first two read the served file; the third reads the source in this repository. All three must print the values above.

```text
cd ~ && curl -s https://cdn.frogly.ai/w/core.v4.js | shasum -a 256
```

prints the sha256 of the served file.

```text
cd ~ && curl -s https://cdn.frogly.ai/w/core.v4.js | openssl dgst -sha384 -binary | openssl base64 -A
```

prints the SRI value of the served file, without the `sha384-` in front.

```text
cd frogly-widget && npm run build
```

builds `dist/core.v4.js` from `src/core.js` and prints the size, the sha256 and the SRI value of what it built. When those match the two commands above, the file on the CDN is this source, byte for byte.

## What the script does

- Adds a few hidden nodes to the page: two off screen links, two HTML comments, one small config object, one short note, and two hidden forms. None of them is visible, none can be reached with the Tab key, and screen readers skip them. The core does not change, hide, move, or remove anything that was already on the page.
- Adds two dull footer links with labels such as Staff, Status, or Docs, inside the page's own footer next to the links already there, in the same size and colour. A page with no footer gets them at the end of `main`; an app shell that is fixed to the window or scrolls inside itself gets none. A person can see those two, and nothing happens if they click one except a harmless page.
- Sends a short check-in when the page loads, and a short note when one of those added nodes is used.
- When a real form on the page is submitted, looks for three attack patterns in plain text fields and sends only the name of the field and the pattern that matched. It skips any form that has a password, email, phone, or payment field.
- Sends a short miss note when the browser says it is automated, when keys arrive faster than a person types, or when many pages open in a few seconds.
- Works inside a 50 ms budget on load and gives up on a task quietly when it runs over.

## What the script never does

- Frogly never sends anything a visitor types. It never reads passwords, email addresses, phone numbers or payment fields. Other text a visitor submits is checked in the browser for attack patterns; only a yes/no, the pattern name and the form field's name leave the browser, never the text itself. Proved by `sends only field_name, pattern_id, and matched for a plain form` and `skips a form that holds a password, an email, or a card field` in `test/core.test.mjs`.
- It never changes, hides, moves, or removes anything that was already on the page.
- It never stops a click or a form on the real page. The only forms it cancels are the hidden forms it added itself.
- It never blocks a visitor. It only watches.
- It never stores a cookie. It keeps one random session id in `sessionStorage` for the tab.
- It never runs code from the config. The config is data. The script rejects a config that contains `<`, `>`, or a `javascript:` address, or whose shape is wrong.
- It never loads another script. It has no `eval`, no `new Function`, no `innerHTML`, and no `document.write`. The build fails if any of those appear.
- It never talks to a database. It only talks to the two hosts named in the config: the one it was loaded from and the one that receives events.
- It never does anything when the config fails to load, or when the events request fails. Then it stops and leaves the page alone.

## Run the tests

This folder has one development dependency (Playwright, for the browser test) and needs Node.js 22 or newer.

```text
cd frogly-widget && npm install
cd frogly-widget && npm run build
cd frogly-widget && npm test
```

`npm run build` fails when the script does not parse, grows past 15 KB, contains a word an intruder must not see, or contains a construct the core must never use.

`npm test` runs 24 tests in a pretend browser (`test/fake-dom.mjs`) and needs no download: the hash check against `docs/INTEGRITY.md`, the frozen version 3 bytes, the hidden set, where the two footer links land on each page shape, the form rules, the fail open behaviour when the API is down, and the 50 ms budget. The config the tests use is `test/fixture-cfg.mjs`; its host, tokens, paths and texts are made up for the tests.

The real browser test in `test/browser.test.mjs` is cloud-only: it runs in the Frogly cloud test environment, not on developer machines, and each run is recorded with its Playwright and Chromium versions in `docs/TESTING.md` of the private repository. `npm run test:browser` only prints a line saying so. It proves that the host page keeps its layout in a real Chromium, that the two footer links land inside the footer's own list, at the end of `main`, nowhere on a fixed app shell, and come back once when a single page app redraws its footer, and that the browser refuses a copy of the core with one byte changed under the real integrity value.

## Files

- `src/core.js`: the script, as one string, plus its version number.
- `src/core.v3.js`: the frozen version 3 bytes, still served at the old address for pages that pinned it.
- `build.mjs`: the build and its checks.
- `test/`: the tests, the pretend browser, and the test config.
- `docs/INTEGRITY.md`: the current size, SHA-256, and SRI value.
- `LICENSE`: MIT.
