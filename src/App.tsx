import { useEffect, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";

const supportEmail = "chooseyourharduk@gmail.com";

const outcomeMessages = {
  done: ["Day 6 recorded as Done.", "The work counts."],
  adapted: ["Day 6 recorded as Adapted.", "The plan changed, the effort still counts."],
  recovery: ["Day 6 recorded as Recovery.", "Deliberate recovery counts."],
  missed: ["Day 6 recorded as Missed.", "Tomorrow stays open."],
} as const;

type Outcome = keyof typeof outcomeMessages;

function Brand() {
  return <Link className="brand" to="/" aria-label="Choose Your Hard home"><img src="/brand/hibar-mark.svg" alt="" width="42" height="42" /><span className="brand-name">Choose<br />Your Hard</span></Link>;
}

function Chrome({ children }: { children: React.ReactNode }) {
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-nav shell"><Brand /><nav className="nav-links" aria-label="Primary navigation"><Link to="/#how">How it works</Link><Link to="/#crew">Crew</Link><NavLink to="/support">Support</NavLink><a className="nav-cta" href={`mailto:${supportEmail}?subject=Choose%20Your%20Hard%20testing`}>Email about testing</a></nav></header><main id="main">{children}</main><footer><div className="footer-inner shell"><div className="footer-lockup">Choose the hard that takes you somewhere.</div><nav className="footer-links" aria-label="Footer navigation"><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/support">Support</Link><Link to="/delete-account">Account deletion</Link></nav></div></footer></>;
}

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    const legacyRoutes: Record<string, string> = { "#terms": "/terms", "#privacy": "/privacy", "#support": "/support", "#delete-account": "/delete-account" };
    if (location.pathname === "/" && legacyRoutes[location.hash]) { window.location.replace(legacyRoutes[location.hash]); return; }
    const pages: Record<string, [string, string]> = {
      "/": ["Choose Your Hard | Private Accountability & Challenge Tracker", "A private accountability and daily challenge tracker for iPhone. Set a finish line, complete today’s move, track honest progress, and stay accountable with a crew."],
      "/terms": ["Terms | Choose Your Hard", "Pre-release terms information for the Choose Your Hard iPhone accountability and challenge tracking app."],
      "/privacy": ["Privacy | Choose Your Hard", "Learn how Choose Your Hard keeps daily check-ins, notes, photos, and challenge proof private by default."],
      "/support": ["App Support | Choose Your Hard", "Get Choose Your Hard support for sign-in, purchases, account access, privacy, safety, and iPhone app issues."],
      "/delete-account": ["Delete Your Account | Choose Your Hard", "How to permanently delete your Choose Your Hard account and private app data, with email support if you cannot access the app."],
    };
    const isPrivateRoute = location.pathname.startsWith("/join/");
    const [title, description] = pages[location.pathname] ?? ["Page not found | Choose Your Hard", "This Choose Your Hard page could not be found."];
    document.title = title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute("content", description);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute("content", title);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute("content", description);
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute("content", isPrivateRoute || !pages[location.pathname] ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", `https://chooseyourhard.co.uk${pages[location.pathname] ? location.pathname : "/"}`);
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function PhonePreview() {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const labels: Record<Outcome, string> = { done: "I did the day", adapted: "Adapted it", recovery: "Recovery", missed: "Missed" };
  return <div className="notebook-stage" aria-label="Choose Your Hard Today screen preview">
    <aside className="paper-note one">Consistency is not perfection.<small>It is choosing again after the hard day.</small></aside><aside className="paper-note two">Your proof stays yours.<small>Notes and optional media start private.</small></aside>
    <div className="phone" aria-label="Interactive iPhone-style preview"><span className="side-button mute" aria-hidden="true" /><span className="side-button volume-up" aria-hidden="true" /><span className="side-button volume-down" aria-hidden="true" /><span className="side-button power" aria-hidden="true" />
      <div className="phone-screen"><div className="iphone-status" aria-hidden="true"><span>9:41</span><span className="dynamic-island" /><span className="phone-signals"><i className="signal" /><i className="wifi" /><i className="battery" /></span></div>
        <div className="phone-top"><img className="mini-mark" src="/brand/hibar-mark.svg" alt="" width="31" height="31" /><span className="handle">INTERACTIVE PREVIEW · TODAY</span></div>
        <div className="phone-content"><span className="phone-label">Today · do the day</span><h2 className="phone-title">Run your first 5K</h2>
          <div className="countdown"><div className="day"><small>DAY</small><b>06</b></div><div className="finish"><small>OF 21</small><b>FINISH LINE</b><small>15 DAYS LEFT</small><div className="progress" /></div></div>
          <div className="move"><span className="phone-label">Today’s move</span><h3>Walk-run for 25 minutes at an easy pace.</h3><p>This is the app’s existing fictional sample challenge, not live member data.</p></div>
          <div className="outcomes" aria-label="Choose a check-in outcome">{(Object.keys(outcomeMessages) as Outcome[]).map((key) => <button className={`outcome ${key} ${outcome === key ? "is-selected" : ""}`} type="button" aria-pressed={outcome === key} onClick={() => setOutcome(key)} key={key}>{labels[key]}</button>)}</div>
          <div className="privacy-note">Your note and optional proof start private.</div><div className="checkin-feedback" role="status" aria-live="polite">{outcome ? <><strong>{outcomeMessages[outcome][0]}</strong> {outcomeMessages[outcome][1]}</> : "Tap an outcome to simulate today’s check-in."}</div>
        </div><span className="home-indicator" aria-hidden="true" />
      </div>
    </div>
  </div>;
}

function HomePage() {
  return <><section className="hero" aria-labelledby="hero-title"><div className="hero-grid shell"><div className="hero-copy"><h1 id="hero-title">Hard days still count.</h1><p>Choose Your Hard is a private accountability and daily challenge tracker for iPhone. Choose a finish line, do today’s move, and record what really happened—without fake streaks or shame.</p><div className="hero-actions"><a className="button primary" href="#how">See how it works</a><a className="text-link" href={`mailto:${supportEmail}?subject=Choose%20Your%20Hard%20testing`}>Ask about testing <span aria-hidden="true">→</span></a></div><p className="release-note">Currently in iPhone testing. Email <a href={`mailto:${supportEmail}?subject=Choose%20Your%20Hard%20testing`}>{supportEmail}</a>.</p></div><PhonePreview /></div></section>
    <section className="principles" aria-label="Choose Your Hard principles"><div className="principles-row shell"><div className="principle"><strong>No reset shame.</strong><span>A missed day stays one honest day, not a reason to erase your progress.</span></div><div className="principle"><strong>No public ranking.</strong><span>Your crew can encourage the work without turning it into a performance.</span></div><div className="principle"><strong>No perfect streak gate.</strong><span>Finish honestly and keep the reflection in your private medal cabinet.</span></div></div></section>
    <section className="editorial shell" id="how" aria-labelledby="how-title"><div className="section-intro"><h2 id="how-title">A finish line you can see.</h2><p>Choose Your Hard turns a vague ambition into one daily move, then gives every day a truthful place in the story.</p></div><div className="journal-steps">
      <article className="journal-step"><span className="step-no">01</span><h3>Choose what matters now.</h3><p>Create your own challenge, join friends privately, or enter a public challenge already moving. Your day one begins when you choose it.</p></article>
      <article className="journal-step"><span className="step-no">02</span><h3>Record the real day.</h3><div><p>Done is not the only honest outcome. Adapt the plan, take deliberate recovery, or record a miss without erasing the work behind you.</p><div className="state-line"><span>Done</span><span>Adapted</span><span>Recovery</span><span>Missed</span></div></div></article>
      <article className="journal-step"><span className="step-no">03</span><h3>Keep proof on your terms.</h3><p>Add a note, photo, or short private video when it helps. Sharing is optional. In public challenges, your note and proof stay private.</p></article>
      <article className="journal-step"><span className="step-no">04</span><h3>Finish honestly.</h3><p>Your completed challenge and reflection stay in a private medal cabinet. No perfect attendance gate. No leaderboard deciding whether the work counted.</p></article>
    </div></section>
    <section className="showcase shell" id="crew" aria-labelledby="crew-title"><div className="showcase-grid"><div><div className="browser-card" aria-label="Crew activity preview"><div className="browser-bar" aria-hidden="true"><i /><i /><i /></div><div className="crew-preview"><div className="crew-row"><span className="avatar">SM</span><span className="person">@slowmiles<small>Checked in · Day 8</small></span><span className="encourage">Keep going</span></div><div className="crew-row"><span className="avatar">YB</span><span className="person">@yellowbib<small>Checked in after a missed day · Day 6</small></span><span className="encourage">Tomorrow is open</span></div><div className="crew-row"><span className="avatar">NF</span><span className="person">@notfastyet<small>Recovery today · Day 3</small></span><span className="encourage">Recovery counts</span></div></div></div><p className="sample-note">Fictional sample crew from the app preview. No counts, rankings, or reactor names.</p></div><div className="showcase-copy"><h2 id="crew-title">People, not pressure.</h2><p>A crew can see only what you choose to share. Like the effort. Encourage the next move. Leave the public performance theatre somewhere else.</p><a className="button primary" href="#privacy">See how privacy works</a></div></div></section>
    <section className="crew" id="privacy" aria-labelledby="privacy-title"><div className="crew-grid shell"><div className="crew-copy"><h2 id="privacy-title">Private starts as the default.</h2><p>Daily check-ins, notes, photos, and videos begin private. You decide what reaches a crew. Public challenges show the handle and result while notes and proof stay private.</p></div><div className="privacy-card"><blockquote>“Share the effort only when sharing helps.”</blockquote><div className="privacy-list"><span>Optional notes and proof</span><span>No continuous location</span><span>No contacts address book</span><span>In-app account deletion</span></div></div></div></section>
    <section className="launch shell" aria-labelledby="launch-title"><div><p className="eyebrow">Now testing</p><h2 id="launch-title">Built for iPhone.</h2></div><div><p>The accountability app is in active testing. We’ll add the public App Store link when the listing is live.</p><a className="button primary" href={`mailto:${supportEmail}?subject=Choose%20Your%20Hard%20testing`}>Ask about testing</a><p className="contact-line">Or email <a className="contact-email" href={`mailto:${supportEmail}?subject=Choose%20Your%20Hard%20testing`}>{supportEmail}</a></p></div></section>
  </>;
}

function UtilityPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) { return <section className="utility-page shell"><header><h1>{title}</h1><p>{intro}</p></header>{children}</section>; }

function TermsPage() { return <UtilityPage title="Terms" intro="Plain-language information about using Choose Your Hard while the app is in testing."><div className="notice"><strong>Pre-release information — not the final Terms.</strong> The reviewed legal document is not yet approved for publication. This page does not create or replace final terms.</div><div className="legal-layout"><nav className="toc" aria-label="Terms contents"><a href="#about">About the service</a><a href="#eligibility">Eligibility</a><a href="#safety">Safe use</a><a href="#subscriptions">Subscriptions</a></nav><div className="legal-copy"><h2 id="about">About the service</h2><p>Choose Your Hard is an accountability app for recording personal challenges, participating in crews, and keeping a private history of your work.</p><h2 id="eligibility">Eligibility and accounts</h2><p>The current product is intended for people aged 16 or older. Final launch territories and the complete account rules will appear in the reviewed Terms.</p><h2 id="safety">Use the service safely</h2><p>The app is not a healthcare provider or emergency service. Choose activities appropriate for you, and adapt or stop any activity that feels unsafe.</p><h2 id="subscriptions">Optional subscriptions</h2><p>Apple manages eligible in-app subscriptions. Deleting your account does not cancel an Apple subscription; manage it separately through Apple.</p></div></div></UtilityPage>; }

function PrivacyPage() { return <UtilityPage title="Privacy" intro="A clear view of the app’s current privacy defaults before the final policy is published."><div className="notice"><strong>Pre-release information — not the final Privacy Policy.</strong> Hosting, processors, retention, transfers, and the operator response process still require approval before publication.</div><div className="legal-layout"><nav className="toc" aria-label="Privacy contents"><a href="#defaults">Private by default</a><a href="#information">Information used</a><a href="#choices">Your choices</a><a href="#deletion">Deletion</a></nav><div className="legal-copy"><h2 id="defaults">Private by default</h2><p>Daily check-ins begin private. You choose when supported content is shared with a crew. Public challenges expose the handle and result while notes and proof remain private.</p><h2 id="information">Information the app uses</h2><p>The service uses account, challenge, check-in, crew, subscription, and optional notification information. Optional AI requests and moderation of shared content serve separate purposes.</p><h2 id="choices">Your choices</h2><p>You can control sharing, notifications, country participation, and optional AI features. The core flow does not need continuous location or a contacts address book.</p><h2 id="deletion">Deleting information</h2><p>In-app deletion removes private account-linked data and media. A limited shared challenge shell may remain when other members still use it. Contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a> if you cannot access the app.</p></div></div></UtilityPage>; }

function SupportPage() { return <UtilityPage title="Support" intro="Help with account access, purchases, safety, privacy, or something that is not working."><div className="support-grid"><article className="support-block"><h2>Account and sign-in</h2><p>Help with email codes, Apple sign-in, profile setup, or getting back into an account.</p></article><article className="support-block"><h2>Purchases</h2><p>Help restoring an eligible purchase or resolving access that does not match an Apple subscription.</p></article><article className="support-block"><h2>Safety and privacy</h2><p>Ask about a moderation decision, report a concern, or make a privacy request.</p></article><article className="support-block"><h2>Something broke</h2><p>Include what you were doing, what appeared on screen, and your iPhone model if you know it.</p></article></div><div className="hero-actions"><a className="button primary" href={`mailto:${supportEmail}`}>Email support</a><Link className="button ghost" to="/delete-account">Delete my account</Link></div></UtilityPage>; }

function DeleteAccountPage() { return <UtilityPage title="Delete your account" intro="Delete immediately inside the app, or contact support if you cannot access your account."><div className="notice">Deleting the app does not delete your account or cancel an Apple subscription. Manage the subscription separately through Apple.</div><ol className="delete-steps"><li><div><strong>Open Choose Your Hard</strong><br />Sign in and open the Me tab.</div></li><li><div><strong>Find Help &amp; Legal</strong><br />Select “Delete account immediately”.</div></li><li><div><strong>Review the warning</strong><br />Private data and media are permanently removed. Shared challenges may keep a limited shell for remaining members.</div></li><li><div><strong>Confirm deletion</strong><br />The app asks once more before starting the irreversible process.</div></li></ol><div className="hero-actions"><a className="button primary" href={`mailto:${supportEmail}?subject=Account%20deletion%20help`}>Request deletion help</a></div></UtilityPage>; }

function InvitePage() { const { code = "" } = useParams(); const validCode = /^[A-F0-9]{10}$/.test(code); return <UtilityPage title={validCode ? "You’ve been invited." : "This invite link isn’t valid."} intro={validCode ? "Open Choose Your Hard on your iPhone to join this challenge." : "Ask the person who invited you to send a fresh link."}>{validCode ? <div className="invite-card"><p className="eyebrow">Invite code</p><strong>{code}</strong><a className="button primary" href={`chooseyourhard://join/${code}`}>Open in Choose Your Hard</a><p>The iPhone app is currently in testing. There is no public App Store listing yet.</p></div> : <Link className="button ghost" to="/">Back to the website</Link>}</UtilityPage>; }

function NotFoundPage() { return <UtilityPage title="That page wandered off." intro="The old web app has retired, and this address does not exist."><Link className="button primary" to="/">Return home</Link></UtilityPage>; }

function AppRoutes() { return <Chrome><RouteEffects /><Routes><Route path="/" element={<HomePage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="/support" element={<SupportPage />} /><Route path="/delete-account" element={<DeleteAccountPage />} /><Route path="/join/:code" element={<InvitePage />} /><Route path="*" element={<NotFoundPage />} /></Routes></Chrome>; }

export default function App() { return <BrowserRouter><AppRoutes /></BrowserRouter>; }
