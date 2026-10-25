# @helpme/converter-engine

Runs conversions in a Web Worker. `createConverterClient()` is the only main-thread entry. Codec
libraries (mediabunny, the AAC and WebP wasm) are `import()`-ed inside the worker, only when a job
needs them, so nothing codec-related loads with the page.
