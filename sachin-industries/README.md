# Sachin Industries

A static, eleven-page industrial website with original SVG artwork, a 24-second 3D process film, interactive Three.js machines, a factory map and the free Sachin CAD 2D drawing workspace. No backend, subscription, CAD account, API key or database is required to run the website.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run check
npm run preview
```

`src/home.html` is the home-page content. `scripts/generate.mjs` generates the service pages, shared navigation, footer, metadata, structured data and crawler files. Edit these source files rather than generated root HTML. `src/design.css` controls the design, `src/main.js` the interactions, `src/models.js` the shared machine geometry, and `src/scenes.js` the interactive viewer. See `FILM-NOTES.md` for the movie and artwork sources.

## Deploy free on Netlify

1. Import the repository into Netlify and set the base directory to `sachin-industries` (omit this if the project folder itself is the repository root).
2. Build command: `npm run build`. Publish directory: `dist`. The included `netlify.toml` supplies these settings.
3. Deploy. The build automatically uses Netlify's `URL` for canonical links, social images and the XML sitemap.
4. If you later use a custom domain, set `SITE_URL` to its HTTPS origin and redeploy.

For manual drag-and-drop hosting, first create the free Netlify site, then rebuild with `SITE_URL` set to that site's actual HTTPS origin and upload `dist`. An origin is not fabricated in local builds.

## Deploy free on Vercel

1. Import the repository. Choose `sachin-industries` as the root directory if needed.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is used for canonical URLs and the sitemap. Set `SITE_URL` explicitly if you want a specific primary origin, then redeploy.

Do not add a catch-all SPA rewrite: these are real static pages, including a native `404.html`.

## Business information and assets

- Latest machine capacities are from the owner's brief: 12 kW fiber laser, 8,000 × 2,500 mm bed, up to 40 mm; bending and shearing up to 25 mm and 8 metres.
- Address, phone numbers, email and 30+ years of experience come from the existing business website: https://sachinindustries.wixsite.com/site
- The updated brief takes precedence over older machine capacities on that site.
- The Google share link could not be resolved by the research tool. Map directions use the established street address, without fabricated coordinates.
- Machine models are stylised interpretations informed by the owner's reference material, with illustrative process motion. They are not engineering models or dimensionally verified digital twins. The laser roof is open in 3D to reveal its working process.
- Maximum thickness and length depend on material grade, tooling and geometry; they are not promised simultaneously for all jobs.
- Every visible machine image is original vector or rendered 3D artwork. The film is a local H.264 MP4 with English descriptions and a visible transcript. There is no factory photography in the hosting output.
- Fonts are self-hosted. Licenses are in `public/licenses/`.
- `references/` contains archived reference photography and retired artwork; `artwork/` contains rendering intermediates. Neither is included in the deployed build.

## Enquiries

Calls and emails use native `tel:` and `mailto:` links. The enquiry dialog prepares a message in the visitor's own email app or WhatsApp; the visitor sends it. Attachments are added in the email app. The site does not silently transmit or store form data. No delivery success is claimed by the page.

## Search and launch

Read `SEO-LAUNCH.md` for the remaining steps that need access to the business's hosting, Search Console and Google Business Profile accounts. Search placement, AI mentions, awards and international demand cannot be guaranteed by code.

## Analytics and discovery

See `ANALYTICS.md` for GA4 activation, consent controls, event definitions, campaign tracking and performance reports. The real Measurement ID is still required; the unconfigured site sends no Analytics events. `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` enable search ownership verification tags. See `.env.example` for the supported public configuration.

See `DESIGN-NOTES.md` for the design references and generated artwork provenance.

## Sachin CAD and the factory map

`/cad.html` contains the browser-based 2D editor. `/cad-guide.html` documents its 49 tools, exact commands, supported file formats and limits. Drawings are processed on the visitor's device, with local recovery and downloadable DXF, SVG and project files. The editor supports precision coordinates, object snaps, layers, dimensions, transformations, profile operations, arrays and fabrication helpers.

The editor is an independent product with explicit support boundaries. Native DWG, 3D solids, parametric constraints, associative dimensions and CAM/machine control are outside its scope. Read `CAD-NOTES.md` for the architecture and verification evidence.

The homepage map loads Google Maps after the visitor clicks **Explore the interactive map**. It uses the established factory address and offers native map navigation and route links. No map API key is needed by this integration. External maps require an internet connection and follow Google's privacy practices.
