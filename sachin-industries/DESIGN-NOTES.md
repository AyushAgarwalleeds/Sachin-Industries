# Sachin Industries: machines as the visual identity

The current design uses original stylised machinery throughout. Graphite, warm ivory and fluorescent lime connect the models, technical SVG studies, typography and interface. The business name, Pune location, three services and headline capacities appear near the start of the page.

The desktop hero runs the original 3D process film behind the introduction. Phone and tablet layouts use SVG artwork and leave video playback to the visitor. The site includes a dedicated film section, a watch page with a transcript, and an interactive machine explorer with 3D and vector diagram modes.

## Creative references

These sites were reviewed for presentation principles, without copying their layouts or assets:

- https://lusion.co/ and https://www.awwwards.com/sites/lusion-v3 — cinematic 3D storytelling.
- https://bruno-simon.com/ — exploration through interaction.
- https://www.apple.com/mac/ — clear categories, specifications and next steps.
- https://www.awwwards.com/annual-awards/hall-of-fame — the Lando Norris and Scout Motors award records and product storytelling.
- https://www.awwwards.com/mobile-excellence-guidelines.pdf — responsive usability and accessible calls to action.

These are references, not a claim to an objective ranking or an award.

## Original artwork

`src/models.js` supplies the stylised machine geometry. `scripts/illustrations.mjs` projects that geometry into SVG faces, giving the service cards, hero, diagrams, capability sheet and brand study a shared visual language.

`scripts/render-film.py` renders the 24-second film in Blender, using exported machine geometry plus purpose-built close-ups of the three operations. The movie, poster and social preview are rendered artwork. No real or photoreal factory images remain in `public/`.

Runway was checked for generative video; its connected plan did not support video generation. The delivered film is an original programmatically authored 3D animation, not a Runway generation. See `FILM-NOTES.md` for sources and rebuild details.

Machine dimensions and motion are illustrative. Published capacities come from the owner's brief, with material, tooling and geometry qualifications. No fictitious customers, reviews, certifications or tolerances were added.

## Motion and performance

The H.264 film is approximately 1.7 MB at 1280 × 720, with 24 frames per second and a fast-start container. It is silent and includes optional English descriptions. The decorative hero plays only on larger screens, respects motion preferences and data-saving requests, and pauses off screen or when the page is hidden.

GSAP controls selected introductions and scroll transitions. Three.js loads near the machine explorer; service pages use static SVGs. The site retains native scrolling, keyboard tabs, motion pause, reduced-motion support, image fallbacks and crawlable HTML. Analytics and web-vitals remain consent gated.
## A drawing workspace inside the factory website

The homepage now introduces Sachin CAD with an original animated vector profile study. The editor uses the same graphite/lime identity in a focused drawing interface, with a grid, command line, geometric grips, layer inspector and purpose-based tool groups. It is open to visitors without an account or lead-capture gate.

The factory location section pairs a branded vector locator cover with the interactive Google map. Loading the map is a visitor action; the native map provides pan/zoom controls and directions. The website's illustration-only art direction remains intact outside the map provider's own cartography.

See `CAD-NOTES.md` and the website's CAD guide for the implemented tools, source layout and precise limits.
