# Verification

Verified 6 November 2026.

## Current CAD and map version

- Production build passed: eleven static pages, 345 local links/assets, 12 accessible images and eleven JSON-LD graphs. The production-origin fixture checks a ten-entry sitemap, canonical/social URLs, CAD WebApplication data, four matching CAD FAQs, all 49 command-guide entries, the homepage CAD link and map loader.
- Geometry and interchange checks cover primitive areas, bulged polylines, transforms, reflection, join/explode, offset, trim/extend, fillet/chamfer, Boolean operations, hatch, bend allowance, mm/inch round trips, cubic splines, transformed block imports, export scopes and malformed-file rejection. DXF round trips preserve custom layer colours and dashed/dotted styles.
- Actual browser drafting covered typed closed polylines and circles, absolute/relative coordinates, numeric radius changes, undo/redo, moving a selection, a native DXF download and re-import, fabrication layouts, drawing review, dragged grips and physical unit conversion. These are representative workflows; every command was not individually exercised in the browser.
- The actual downloaded two-entity DXF and the fifteen-entity interchange fixture both passed an independent ezdxf audit as AC1021 DXF with millimetre units: zero errors and zero repairs. The final production worker also returned a successful 21-entity example DXF export.
- Phone CAD, the complete 49-command guide and the loaded factory map fit 375 CSS pixels without page overflow. Tablet CAD fits 753 CSS pixels; desktop CAD fits 1425. The mobile layer drawer, expanded workspace and drawing recovery were exercised. Escape clears selection before leaving the expanded workspace and correctly resets its control label.
- The interactive Google map resolved to Sachin Industries, S-68, MIDC Bhosari, Pune. Its native destination link confirms coordinates 18.6272701, 73.8410127 and Google CID 3797655774939394096. Native map camera controls opened successfully. Google is contacted only after the visitor loads the map.
- CAD drawings stay on the visitor's device. Analytics tests verify that drawing names, coordinates, file contents and map address are excluded from event payloads. GA4 remains inactive until the owner configures a real Measurement ID and the visitor consents.
- The production dependency audit against the official npm registry reported zero known vulnerabilities. Paper.js, dxf-parser and the DXF writer license notices are included in `public/licenses/`.
- The refreshed deployment ZIP contains 46 files, including all eleven pages, the separate interchange worker, the film and nine dependency/font license notices. Final CAD console checks reported no errors. CAD and map screenshots are saved under `qa/`.

The CAD module loads only on the CAD page and is about 169 kB gzipped, with file interchange in a separate worker. `CAD-NOTES.md` documents the architecture and exact limits. This is an independent 2D editor, not full AutoCAD: DWG, 3D solids, parametric constraints, CAM and machine control are outside its scope.

## Earlier 3D and film verification

- `npm run build`: passed with Vite 7.3.7 and Three.js 0.180.0.
- `npm run check`: passed for nine static pages, 257 local links/assets, 12 accessible images and nine JSON-LD graphs. Page titles, descriptions, anchors, business details and image dimensions were checked.
- An isolated production-origin fixture verified absolute canonical and social URLs, an eight-entry sitemap, visible FAQ markup, GA4 configuration, Google/Bing ownership tags and 404 noindex controls. Test origins and fake test IDs are not shipped.
- The same fixture verified the VideoObject, its 24-second duration, actual media and thumbnail URLs, three Clip objects, watch page, English track and video sitemap metadata. The MP4 container and actual hosted media asset were checked.
- Retired photographic asset paths are absent from every generated page. The only raster images in `public/images/` are the rendered 3D movie poster and social preview.
- Browser playback reported 24 seconds, 1280 × 720, readyState 4 and no media error. Bending and shearing chapter controls sought to 8 and 16 seconds and played successfully. The timed watch link `?t=8` sought to 8 seconds while remaining paused.
- Desktop review covered the animated hero, updated 3D bending machine and vector diagram switch. The explorer rendered one WebGL canvas and its bending diagram used the correct SVG.
- Phone (390 × 844), tablet (768 × 1024) and desktop (1440 × 900) tests found matching content and available layout widths: 375, 753 and 1425 CSS pixels. Phone navigation reached the film page; all three chapter buttons were present.
- The phone hero used the laser SVG. Its decorative video stayed paused with readyState 0, confirming that it was not loaded. The tablet hero also kept the decorative video paused.
- The current unconfigured build inserted no Google Analytics script. Cookie settings stay hidden until a real Measurement ID is configured.
- Analytics tests made no external requests. They verified blocked tracking before consent, acceptance/rejection/withdrawal/re-consent, no duplicate tag injection, advertising consent denied, GA-only cookie clearing, enquiry/video PII exclusion, safe campaign URLs, video milestones and the diagram-view event.
- No browser console errors were observed in the checked views. Preview screenshots are in `qa/`, excluded from hosting and Git.

The 3D engine remains a separate lazy-loaded chunk of about 129 kB gzipped. Vite reports that its uncompressed size exceeds the default 500 kB advisory threshold. Service pages do not load the engine. The final film is approximately 1.7 MB, silent, with native controls and English descriptions.

## Earlier interaction verification

The preceding redesign also exercised all three machine tabs, drag rotation, reset, keyboard End navigation, motion pause, FAQs, the capability sheet and the enquiry dialog. Escape closed the dialog. Preview enquiry fields and process selection were exercised without sending email or WhatsApp messages.

## Practical limits

No public hosting deployment was performed. Hosted performance scores, real-user Core Web Vitals, actual mobile hardware, search indexing, ranking, AI recommendations and award judging are not established by these checks. The source is ready for Netlify/Vercel builds; the actual production origin enables canonical and sitemap generation. Live GA4 delivery still needs the owner's Measurement ID.

The hosting ZIP was refreshed from this verified build. For a manual drag-and-drop launch, rebuild with the actual production `SITE_URL` first, as described in `README.md`.
