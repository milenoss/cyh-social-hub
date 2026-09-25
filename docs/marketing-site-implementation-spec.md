# Choose Your Hard marketing site implementation

Status: approved and implemented locally. Production publication waits for the compatible 18+ app rollout, live-byte verification, and atomic legal-version activation described below.

## Outcome

Replace the obsolete social web app with the approved warm editorial marketing site. The website explains the real iPhone product, lets visitors try a local check-in simulation, and provides dedicated Terms, Privacy, Support, and Account Deletion pages. Preserve the existing GitHub repository, Netlify project, and `chooseyourhard.co.uk` domain configuration.

The mobile app at `/Users/mk1883776/personal/choose-your-hard` is the product and brand source of truth. Use its official Raise the Bar H mark, product language, outcome states, crew examples, privacy defaults, support address, and deletion flow.

## Information architecture

- `/`: editorial landing page with product explanation, interactive iPhone preview, how it works, crew, privacy, and TestFlight status.
- `/terms`: final public Terms and Conditions used by the iPhone app.
- `/privacy`: final public Privacy Policy used by the iPhone app.
- `/support`: dedicated support page with the verified support email.
- `/delete-account`: dedicated deletion instructions and support fallback.
- `/join/:code`: preserves the iPhone universal-link invite fallback.
- Unknown paths: branded 404 with a route home.

The old authentication, dashboard, challenges, leaderboards, and web account flows are no longer routed or presented as supported products.

## Visual and interaction contract

- Reproduce the approved `prototypes/marketing-site-pampam.html` direction.
- Use parchment cream, paper white, warm ink, lavender hairlines, and one periwinkle action colour.
- Use DM Serif Display for editorial headings and Satoshi for interface and body copy.
- Use the official Hibar mark geometry and colours from `assets/brand/svg/mark.svg` in the mobile repository.
- Keep the app preview visually distinct with the mobile app palette and typography roles.
- The phone has an iPhone-style shell, Dynamic Island, status indicators, side controls, and home indicator without using Apple trademarks in copy.
- Done, Adapted, Recovery, and Missed are keyboard-operable buttons. Selecting one updates the selected state and an `aria-live` confirmation. It saves nothing and sends no request.
- Respect reduced motion, visible focus, semantic headings, landmarks, and 44px mobile touch targets.

## Content and trust boundaries

- Use only verified app features and fictional sample data already present in the mobile prototype: `Run your first 5K`, day 6 of 21, and the sample crew handles.
- State that the app is in iPhone testing. Do not claim a public App Store release.
- Use `chooseyourharduk@gmail.com` for launch, support, privacy, and deletion contact.
- Publish complete, dated Terms and Privacy Policy based on the shipped app and production services. Identify SUKHAVATI LTD, its registered details, the support contact, user rights, providers, retention criteria, international processing, subscriptions, moderation, optional AI, and account deletion without claiming a lawyer reviewed the documents.
- Account deletion instructions use Me, Help & Legal, and Delete account immediately. State that account deletion does not cancel an Apple subscription.
- Do not add analytics, cookies, forms, Supabase calls, sign-in, or tracking.

## Responsive flow

- Desktop: two-column hero with the interactive phone as the primary product visual.
- Tablet: single-column content where necessary while preserving editorial spacing.
- Mobile: compact navigation, single-column sections, phone contained within the viewport, readable legal text, and no horizontal overflow.
- Dedicated pages reuse the same global navigation and footer, show a clear page title, and always provide a route home.

## Edge cases

- External fonts fail: system serif and sans-serif fallbacks keep the hierarchy readable.
- JavaScript is unavailable: all marketing and legal content remains readable; only the check-in simulation is inert.
- Repeated outcome selection: exactly one outcome remains pressed and the latest confirmation replaces the previous one.
- Direct navigation or refresh on every route: Netlify SPA fallback serves the correct React route.
- Narrow devices and large text: content wraps without clipping or horizontal scrolling.
- Unknown URL: visitor sees a branded 404 rather than the retired application.
- A direct app open of `/terms` or `/privacy` shows the current dated document without a pre-release warning.
- Material policy changes require a new dated version; old acceptances must not silently cover the new version.

## Acceptance criteria

1. The root route matches the approved PamPam prototype and uses the official Hibar mark.
2. `/terms`, `/privacy`, `/support`, and `/delete-account` are separate navigable pages with unique titles and content.
3. No retired authentication, dashboard, explore, leaderboard, or challenge web UI is reachable through the router.
4. All four simulated check-in outcomes work by pointer and keyboard, expose one `aria-pressed="true"`, and update the live status text.
5. Marketing claims and samples match the mobile source of truth and fictional data is labelled.
6. Legal pages are complete, dated public documents and include the company disclosures required for the UK operator.
7. Support and deletion links use the verified support address and deletion instructions.
8. The site has no console errors, dead internal links, or horizontal overflow at 375px, 768px, and desktop widths.
9. TypeScript, production build, lint, and a focused route/content check pass.
10. `netlify.toml`, `public/_redirects`, and `public/CNAME` retain the existing Netlify and domain connection, apart from the minimum CSP update required for approved web fonts.
11. Only intentional marketing-site files are committed. Existing unrelated `.gitignore` and stray untracked files remain untouched.
12. Legacy `/#terms`, `/#privacy`, and `/#support` app links resolve to their dedicated routes, and `/join/*` remains associated with the iPhone app.

## Final legal publication gates

Complete these in order before production activation:

1. Serve Terms and Privacy as separate standalone documents whose response bytes contain the full copy without JavaScript, then calculate and record a distinct SHA-256 digest for each.
2. After the live documents pass direct-route checks, add one immutable production `legal_documents` version and atomically point `legal_release.version` to it. Verify fresh acceptance, stale-version rejection, existing-user re-acceptance, and rollback by pointer change rather than mutating the registered version.
3. Match current production behaviour: a first eligible challenge creation or crew membership may be free and later creations or joins require Pro; the current UI offers 21, 45 and 75-day finish lines; medals are generic; the fourth outcome is Recovery.
4. Fix account deletion so identifying owner-authored challenge text is removed or anonymised when a shared challenge shell remains, then describe exactly what is retained.
5. Confirm the processor inventory, international-transfer safeguards, provider log/backup retention criteria, deletion propagation, support-mailbox operation, App Store seller entity, launch territories, and consumer terms.
6. Resolve the 16+ launch position through the required child-access, Children’s Code, privacy and online-safety assessments, or approve and implement an 18+ product change before publication.
7. Define and operate the reporting, moderation, complaint, appeal, reinstatement, and response process required for a user-to-user service.
8. Show the UK company disclosure site-wide: SUKHAVATI LTD, company number 15497121, registered in England and Wales, registered office 99 Cowley Mill Road, Uxbridge, England, UB8 2QB.
9. Remove all draft, pre-release, placeholder, and publication-hold wording; include an effective date and immutable version; link the final URLs in the app and App Store metadata.

## GSTACK REVIEW REPORT

Verdict: PASS WITH REQUIRED CHANGES, resolved before implementation.

- The final-publication request does not by itself resolve factual and operational holds. Final publication remains blocked until the gates above pass.
- The mobile app still references legacy hash URLs. A compatibility redirect preserves those links.
- The apex domain owns iPhone universal links. The implementation preserves `/join/:code` and the Apple association file for `ZB35TCWHV6.com.milen.chooseyourhard`.
- The prototype periwinkle failed normal-text AA contrast. Production uses the darker `#3659cc`; lavender is decorative only, not body copy.
- Missing social image references are removed rather than shipping broken metadata.
