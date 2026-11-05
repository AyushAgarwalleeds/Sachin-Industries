# Search and launch guide

## Included in this website

- Real static HTML on every page. Business facts and service descriptions do not depend on WebGL or JavaScript.
- Dedicated pages for laser cutting, bending and shearing in Pune, with useful machine specifications, applications and job-review information.
- Unique page titles and descriptions, one main heading per page, internal service links and descriptive image alternatives.
- LocalBusiness, Service, WebSite, WebPage, BreadcrumbList and matching visible FAQ structured data. No fabricated ratings, testimonials, customers, accreditations or UK premises.
- Canonical links, absolute social image URLs, XML sitemap and robots.txt generated from the real production origin during deployment.
- A concise `llms.txt` as an optional factual reference. It is not a ranking factor or a promise of AI inclusion.
- Self-hosted fonts, local SVG artwork and compressed 3D media, lazy-loaded 3D, off-screen animation suspension, reduced-motion support, motion pause, keyboard tabs and SVG fallbacks when WebGL is unavailable.
- A printable capability sheet suitable for saving to PDF in the browser.

## Complete after deployment

1. Pick one primary HTTPS URL. Set `SITE_URL` if necessary, rebuild and verify that `/robots.txt` lists the correct `/sitemap.xml` and each page's canonical URL matches the primary site. Free Netlify and Vercel subdomains work; a paid domain is not required to launch.
2. Verify the property in Google Search Console, submit `/sitemap.xml`, and request indexing of the home and service pages. Add the same property to Bing Webmaster Tools if wanted. These require the owner's accounts.
3. Update the existing Google Business Profile's website link and keep the name, address, phone and categories consistent with the real business. Confirm its map pin. Add current, genuine photographs and accurate services; don't create duplicate listings.
4. Link the new site from the old Wix website. If its account supports redirects, configure relevant permanent redirects. Avoid leaving competing copies indefinitely. Update genuine directory, supplier and social profile links.
5. Test the deployed site in Search Console URL Inspection, Google's Rich Results Test, and PageSpeed Insights. Record real mobile performance once hosted; local testing does not establish a Lighthouse score or real-user Core Web Vitals.
6. Add permission-cleared, detailed project case studies: material, thickness, component dimensions, the challenge, the actual process and finished photographs. Ask satisfied customers for genuine reviews. Do not buy links, invent testimonials or create repeated city keyword pages.
7. Measure actual enquiries and the queries that lead to them. Update pages with useful answers to the jobs buyers request.

## For buyers beyond Pune

The website is publicly readable in English once hosted. It does not claim a UK factory, UK delivery, certifications or export operations. To attract international procurement teams, add verified export/transport arrangements, packaging capabilities, quality documentation, inspection reports and relevant case studies when those services are genuinely available. Global awareness needs real evidence, relationships and distribution as well as a strong website.

## Expectations

Google states that the same SEO fundamentals apply to AI Overviews and AI Mode. Technical eligibility does not guarantee crawling, indexing, ranking or inclusion in any AI answer. Awards depend on independent judging. Treat this site as a strong foundation for growth, then build proof and visibility around it.

Official references:

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/appearance/structured-data/local-business
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide

## Added in the redesign

The home page immediately states the business, location, services and headline capacities. A new static buyer guide explains process selection and quotation requirements. The homepage visible FAQ has matching JSON-LD; the production entity graph includes WebSite, WebPage and the business service catalogue. 404 pages are noindexed. Search ownership tags and consent-controlled GA4 instrumentation are implemented; see `ANALYTICS.md` to activate them with real account details. No automated AI endorsement or search placement can be promised.

## Process film and video discovery

The dedicated `/process-film.html` watch page puts the native video player before a visible transcript and links to all three services. English visual descriptions are available in the player. Its production structured data includes a VideoObject with an accurate duration, upload date, thumbnail, media URL and three timed Clip objects. The XML sitemap includes the film's video metadata. Clip links seek to the relevant time without forcing playback.

After deployment, verify that the video and poster return successfully at their absolute HTTPS URLs and inspect the watch page in Search Console. A free subdomain is sufficient for this setup. Keep publication metadata and the transcript consistent when the movie changes. Video features and AI citations are not guaranteed.

Official guidance: https://developers.google.com/search/docs/appearance/video and https://developers.google.com/search/docs/appearance/structured-data/video
## Free CAD application discovery

The free editor at `/cad.html` has its own title, description, WebApplication structured data, free-access offer and four matching visible FAQs. `/cad-guide.html` provides a crawlable command reference, coordinate examples, file-format support, workflow descriptions and limits. Both are included in the ten-URL production sitemap, navigation, homepage feature and factual `llms.txt` reference. The app's creator is linked to the Sachin Industries business entity.

The homepage embeds an interactive factory map after the visitor chooses to load it. Its address and route links use the established Bhosari location; no fabricated geographic coordinates or reviews were added to the business schema.

After deployment, inspect both CAD pages in Search Console and measure relevant queries and actual enquiries separately from general tool traffic. Useful software and clear descriptions can support discovery; placement in search or AI answers remains outside the website's control.
