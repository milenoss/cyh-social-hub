# Choose Your Hard marketing site implementation

Status: approved visual direction, implementation authorised 24 September 2026.

## Outcome

Replace the obsolete social web app with the approved warm editorial marketing site. The website explains the real iPhone product, lets visitors try a local check-in simulation, and provides dedicated Terms, Privacy, Support, and Account Deletion pages. Preserve the existing GitHub repository, Netlify project, and `chooseyourhard.co.uk` domain configuration.

The mobile app at `/Users/mk1883776/personal/choose-your-hard` is the product and brand source of truth. Use its official Raise the Bar H mark, product language, outcome states, crew examples, privacy defaults, support address, and deletion flow.

## Information architecture

- `/`: editorial landing page with product explanation, interactive iPhone preview, how it works, crew, privacy, and TestFlight status.
- `/terms`: dedicated pre-release terms summary.
- `/privacy`: dedicated pre-release privacy summary.
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
- The legal source documents are explicitly not approved for publication. The live pages must therefore be labelled as pre-release summaries, must not claim an effective date, and must preserve the publication warning. They are not substitutes for final reviewed policies.
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

## Acceptance criteria

1. The root route matches the approved PamPam prototype and uses the official Hibar mark.
2. `/terms`, `/privacy`, `/support`, and `/delete-account` are separate navigable pages with unique titles and content.
3. No retired authentication, dashboard, explore, leaderboard, or challenge web UI is reachable through the router.
4. All four simulated check-in outcomes work by pointer and keyboard, expose one `aria-pressed="true"`, and update the live status text.
5. Marketing claims and samples match the mobile source of truth and fictional data is labelled.
6. Legal pages visibly remain pre-release summaries and do not expose the held registered address or invent an effective date.
7. Support and deletion links use the verified support address and deletion instructions.
8. The site has no console errors, dead internal links, or horizontal overflow at 375px, 768px, and desktop widths.
9. TypeScript, production build, lint, and a focused route/content check pass.
10. `netlify.toml`, `public/_redirects`, and `public/CNAME` retain the existing Netlify and domain connection, apart from the minimum CSP update required for approved web fonts.
11. Only intentional marketing-site files are committed. Existing unrelated `.gitignore` and stray untracked files remain untouched.
12. Legacy `/#terms`, `/#privacy`, and `/#support` app links resolve to their dedicated routes, and `/join/*` remains associated with the iPhone app.

## GSTACK REVIEW REPORT

Verdict: PASS WITH REQUIRED CHANGES, resolved before implementation.

- Legal drafts carry publication holds. Production routes are therefore clearly labelled as pre-release information and explicitly state that they are not final policies.
- The mobile app still references legacy hash URLs. A compatibility redirect preserves those links.
- The apex domain owns iPhone universal links. The implementation preserves `/join/:code` and the Apple association file for `ZB35TCWHV6.com.milen.chooseyourhard`.
- The prototype periwinkle failed normal-text AA contrast. Production uses the darker `#3659cc`; lavender is decorative only, not body copy.
- Missing social image references are removed rather than shipping broken metadata.
