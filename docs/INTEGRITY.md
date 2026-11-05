# Core script integrity

The core is one file with the same bytes for every site. Check a served copy against the values below.

<!-- core-v3-start -->
- Version: 3
- File: `core.v3.js`
- Size: 14060 bytes
- Limit: 15360 bytes (15 KB)
- sha256 29fc8308a2322fa85dc3af7fc65eb84e9701694366bf96b6ab9f312da77cad34
- SRI: `sha384-tSxeTnnpzyZ5mErTpUv2Uhuqi/0NRgZPmYxnsXlq0zD8G8tLND0IgVsnT3FI8Eu6`
<!-- core-v3-end -->

To check a served copy from your computer:

```text
cd ~/frogly && curl -s https://cdn.frogly.ai/w/core.v3.js | shasum -a 256
```

The number printed must match the sha256 line above. From a copy of this folder, `npm run build` prints the same three values from the source.

The values above are written by a script in Frogly's private repository, which is the source of truth for this folder: after a change to `src/core.js` it is `cd ~/frogly && node scripts/sync-core.mjs`, and that command rebuilds the file and rewrites the block above along with the install documents there.
