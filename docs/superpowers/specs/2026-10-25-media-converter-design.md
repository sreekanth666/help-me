# Design: in-browser media converter

Date: 2026-10-25
Status: Approved (plan reviewed in session); implemented, see "Not yet verified"

## Problem

Developers need a quick way to convert WebM ↔ MP4 and PNG/JPEG ↔ WebP without uploading files and
without a heavy tool. It must be gentle on the user's machine: low RAM, no big downloads.

## Goals

- WebM ↔ MP4 (video) and PNG/JPEG/WebP any-to-any (images), entirely in the browser.
- Adjustable quality: presets, a quality slider, resize, bitrate/resolution/fps caps, audio options.
- Say honestly what happens: "Fast copy" vs "Re-encoded", estimated and actual size, savings (or "larger").
- Load no codec code until a conversion needs it.

## Non-goals

Image → WebM video, GIF/animated output, MOV/MKV input, trimming, a server fallback. These are follow-ups.

## Decisions

| Area | Decision | Rationale |
|---|---|---|
| Licensing | No code copied from VERT (AGPL-3.0). Upstream libraries used directly: mediabunny (MPL-2.0), jsquash (Apache-2.0), client-zip (MIT) | AGPL would extend to the whole app |
| Video engine | mediabunny on WebCodecs, in a Web Worker, streaming | Frames flow decode→encode with backpressure; the file is range-read, never loaded whole |
| Rejected | `@ffmpeg/core` (GPL-2.0+, ~65 MB, whole file in the wasm heap) | Licence, size, memory |
| WebM → MP4 default | Re-encode to H.264 + AAC; "Keep original codecs (fast copy)" is opt-in | Plays everywhere; fast copy of VP9/Opus into MP4 can fail in QuickTime |
| AAC | Lazy-loaded wasm encoder (`@mediabunny/aac-encoder`) only when the browser lacks one | Browsers rarely encode AAC; credit FFmpeg (LGPL) in the credits dialog |
| WebP encoding | Canvas where it really encodes WebP; `@jsquash/webp` for lossless and for Safari | `canvas.toBlob('image/webp')` silently returns PNG on Safari |
| Large output | Chromium can stream video to a chosen file; elsewhere it is held in memory with a warning | Keeps RAM flat where the API exists |
| Layout | `domain` (pure) ← `engine` (worker, codecs) ← `feature` (React), tags `scope:converter` | Lint stops UI code importing codecs; domain is test-first |
| Wire protocol | Lives in `engine`, not `domain` | It carries DOM types (`FileSystemFileHandle`); the domain stays pure |
| Headers | No COOP/COEP | No `SharedArrayBuffer` is needed |
| Image quality | One slider value is used for WebP and JPEG | Simpler than per-format values; the presets use the WebP numbers |

## Behaviour notes

- A video plan is decided per track: copy when the codec is allowed (fast-copy) or universally
  playable (auto) in the target container and nothing about the picture changes; otherwise re-encode.
  A height cap below the source, an fps cap below the source, or an explicit bitrate forces a re-encode.
- Video bitrate = width × height × fps × bits-per-pixel for the codec and preset, clamped to 300 kbps
  and to the source bitrate (WebCodecs has no CRF).
- If the browser cannot encode what we want, we fall back with a warning (e.g. VP9 in MP4) or block
  with a message that names the fix (Fast copy, Remove audio).

## Not yet verified

- Streaming a video straight to disk ("Save to file…"): needs a native file dialog; not automated.
- Firefox, Safari and mobile browsers. Only Chromium was tested. Capabilities are probed at runtime.
- Very large videos (hundreds of MB to GB) and memory behaviour on low-RAM devices.
- AAC patent terms are a legal question for the owner.
