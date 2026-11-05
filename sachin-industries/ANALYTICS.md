# Analytics and performance measurement

The GA4 integration is implemented. No Measurement ID has been supplied, so the current build does not load Google Analytics or show a consent banner. No invented property ID is used. Adding a real ID and rebuilding activates the consent-controlled integration.

## Activate your own GA4 property

1. Open https://analytics.google.com/ and select or create the property that Sachin Industries should own.
2. Add a Web data stream for the actual public site. Copy its Measurement ID, which begins with `G-`. This is a public tag ID, not an API secret or Google account password.
3. In Netlify or Vercel, set `GA4_MEASUREMENT_ID` to that ID. Set `SITE_URL` if the automatically detected primary origin is not the one you want.
4. Rebuild/redeploy. This integration is built into each HTML page, so changing a hosting environment variable requires a new build.
5. For local testing, copy `.env.example` to `.env.local`, enter your real values, and restart `npm run dev`. The generator loads local environment files; hosting environment variables take precedence.
6. In the deployed site, choose **Accept analytics**, browse a service and use a contact link. Check GA4 Realtime or DebugView for the corresponding events. A browser extension can block analytics; do not bypass a visitor's blocker.
7. Review the web stream's enhanced measurement settings. Disable automatic form interactions and any duplicate page-change/scroll tracking if enabled; this site implements its own intentional events. Google signals and ad personalisation are disabled in the site configuration.

No Google account, property, public hosting deployment, Search Console property or advertising campaign was created by this work. Property ownership and live event delivery need the owner's account and Measurement ID.

## What is measured after consent

| Event | Meaning | Useful parameters |
| --- | --- | --- |
| `page_view` | A page was viewed after analytics consent | Sanitised page URL and title |
| `service_view` | A dedicated laser, bending or shearing page was viewed | `service` |
| `machine_select` | A visitor selected a machine in the 3D explorer | `service` |
| `machine_view` | The explorer switched between 3D and a vector diagram | `service`, `view` |
| `enquiry_open` | The project dialogue was opened | Page |
| `enquiry_prepared` | A valid enquiry was prepared for email or WhatsApp | `service`, `channel` |
| `contact_click` | A phone, email, WhatsApp or directions link was clicked | `channel` |
| `brochure_view` | The capability-sheet page was viewed | Page |
| `brochure_print` | The Print / Save as PDF control was clicked | Page |
| `scroll_depth` | A page reached 25, 50, 75 or 90 percent scroll | `percent_scrolled` |
| `video_start` | A visitor first played an intentional film player | Page |
| `video_progress` | The playhead reached 25, 50 or 75 percent | `video_percent` |
| `video_complete` | A film player reached its end | Page |
| `video_seek` | A visitor selected a process chapter | `service` |
| `web_vital` | Google's web-vitals library reported a performance metric | `metric_name`, `metric_value`, `metric_delta`, `metric_id`, `metric_rating` |

Contact clicks and enquiry preparation are **intent**, not proof of a completed call, a sent message or a won order. Only the visitor's own email or messaging app sends the enquiry. Link real enquiries to your internal sales records when evaluating business results.

## Make the reports useful

- In GA4 custom definitions, register event-scoped dimensions with clear display names for `service`, `channel`, `view`, `metric_name` and `metric_rating`.
- Register numeric custom metrics for `metric_value` and `metric_delta` if you want to analyse the web-vital values in Explore. Filter by metric name: LCP and INP are milliseconds; CLS is unitless. Do not combine their values into a single average.
- Consider marking `enquiry_prepared` as a key event. If you mark `contact_click`, retain the distinction between contact intent and a confirmed lead.
- Use Traffic acquisition to compare sources and campaigns, Pages and screens to understand service interest, and Explore to compare service pages with contact actions.
- Test with Realtime first. Aggregated reporting can take time, and real performance metrics require real visits and interactions. No performance score or visitor count is fabricated by this website.

## Track outreach sources

Use a consistent campaign link when sharing the public site, for example append:

```text
?utm_source=linkedin&utm_medium=organic_social&utm_campaign=large_format
```

The site preserves only allowlisted, short campaign parameters and removes other query parameters and URL fragments from the URLs it sends to analytics. Use letters, numbers, underscores or hyphens in campaign values. Do not put names, email addresses, telephone numbers, customer references or drawing identifiers in campaign URLs.

## Consent and data minimisation

The Google script is not inserted before acceptance. Advertising consent stays denied. Visitors can use Cookie settings in the footer to decline or withdraw analytics; subsequent custom events are gated off and accessible first-party `_ga` cookies are cleared. The preference is stored locally. Enquiry names, company names, drawings and message text are never passed to the custom event API. Analytics is optional for every business feature.

## Measure discovery separately

Google Search Console measures search impressions, clicks, queries and indexing. Add the public URL there and submit `/sitemap.xml`. Set `GOOGLE_SITE_VERIFICATION` to the supplied HTML verification token if you choose that verification method. `BING_SITE_VERIFICATION` adds Bing's equivalent meta tag. These tokens are public verification strings, not account credentials.

Analytics, search verification and a sitemap do not purchase advertising or guarantee distribution. No ad spend, remarketing audiences or paid tools have been enabled.

Official references:

- https://developers.google.com/analytics/devguides/collection/ga4/events
- https://developers.google.com/tag-platform/security/guides/consent
- https://github.com/GoogleChrome/web-vitals
- https://developers.google.com/search/docs/monitor-debug/search-console-start

## Film events

Film events are consent gated and exclude the decorative autoplay hero. Progress events represent playhead milestones, including milestones reached by seeking; they do not establish uninterrupted watch time. Chapter selection reports only the process name. File paths, arbitrary video titles and enquiry content are excluded from the analytics parameter allowlist.
## CAD and map events

The consent-gated integration also supports `cad_start`, `cad_import`, `cad_export` and `map_open`. CAD file events allow only the format (`dxf`, `svg`, `json`) and export scope (`all`, `profiles`, `selection`). Drawing names, file names, contents, coordinates and map addresses are excluded. CAD activity indicates use of the tool; it is not evidence of a manufacturing enquiry or a won order.
