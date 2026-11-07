# Core script integrity

The core is one file with the same bytes for every site. Check a served copy against the values below.

## Version 5, the current core

<!-- core-v5-start -->
- Version: 5
- File: `core.v5.js`
- Size: 15134 bytes
- Limit: 15360 bytes (15 KB)
- sha256 bc058e09c0ebd0db3fae7c4a9d9f77716ec52b51b421e7c3e68c8227d8e6fbc9
- SRI: `sha384-5PrNyFpjR+GGOLhFy+XWlvP9vJtqRDKWrSyGVuWYl907zw26TU0PSCod12iTAUdu`
<!-- core-v5-end -->

To check a served copy from your computer:

```text
cd ~/frogly && curl -s https://cdn.frogly.ai/w/core.v5.js | shasum -a 256
```

The number printed must match the sha256 line above. From a copy of this folder, `npm run build` prints the same three values from the source.

What changed from version 4: the two small visible footer links are off unless the site's signed config carries `footer_links: true`. No site sets that, so version 5 adds nothing a visitor can see. The placing code is unchanged, so a site that turns the switch on gets the version 4 behaviour exactly. Everything else is the same.

## Version 4, frozen

Version 4 is frozen and served as is. Pages that pasted the version 4 line pinned it with the integrity value below, so the old address keeps serving exactly these bytes. They are kept in `src/core.v4.js` and a test checks that file against this hash.

<!-- core-v4-start -->
- Version: 4
- File: `core.v4.js`
- Size: 15088 bytes
- Limit: 15360 bytes (15 KB)
- sha256 1b56a92e09febdd1207d9fabaa8a2b6fc76da048e58c8b1bf1b58b734f9dd006
- SRI: `sha384-cxX6VlSnJbFCRk+9A4zNICeJhYmmoHOLlHP0vqr5CuS5NrQhiWWOIPL6XKI5Cw+Q`
<!-- core-v4-end -->

```text
cd ~/frogly && curl -s https://cdn.frogly.ai/w/core.v4.js | shasum -a 256
```

## Version 3, frozen

Version 3 is frozen and served as is. Pages that pasted the version 3 line pinned it with the integrity value below, so the old address keeps serving exactly these bytes. They are kept in `src/core.v3.js` and a test checks that file against this hash.

<!-- core-v3-start -->
- Version: 3
- File: `core.v3.js`
- Size: 14060 bytes
- Limit: 15360 bytes (15 KB)
- sha256 29fc8308a2322fa85dc3af7fc65eb84e9701694366bf96b6ab9f312da77cad34
- SRI: `sha384-tSxeTnnpzyZ5mErTpUv2Uhuqi/0NRgZPmYxnsXlq0zD8G8tLND0IgVsnT3FI8Eu6`
<!-- core-v3-end -->

```text
cd ~/frogly && curl -s https://cdn.frogly.ai/w/core.v3.js | shasum -a 256
```

The values above are written by a script in Frogly's private repository, which is the source of truth for this folder: after a change to `src/core.js` it is `cd ~/frogly && node scripts/sync-core.mjs`, and that command rebuilds the file and rewrites the current block above along with the install documents there.
