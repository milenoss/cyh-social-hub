import { access, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const aasa = JSON.parse(await readFile(new URL("../public/.well-known/apple-app-site-association", import.meta.url), "utf8"));
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const redirects = await readFile(new URL("../public/_redirects", import.meta.url), "utf8");
const terms = await readFile(new URL("../public/legal/2026-09-25/terms/index.html", import.meta.url), "utf8");
const privacy = await readFile(new URL("../public/legal/2026-09-25/privacy/index.html", import.meta.url), "utf8");

for (const route of ["/terms", "/privacy", "/support", "/delete-account", "/join/:code"]) {
  assert.match(app, new RegExp(`path=\\"${route.replace("/", "\\/")}\\"`));
}
for (const outcome of ["done", "adapted", "recovery", "missed"]) assert.match(app, new RegExp(`${outcome}:`));
assert.equal(aasa.applinks.details[0].appID, "ZB35TCWHV6.com.milen.chooseyourhard");
assert.deepEqual(aasa.applinks.details[0].paths, ["/join/*"]);
assert.match(index, /application\/ld\+json/);
assert.match(index, /Private Accountability &amp; Challenge Tracker/);
assert.match(robots, /Sitemap: https:\/\/chooseyourhard\.co\.uk\/sitemap\.xml/);
for (const route of ["terms", "privacy"]) {
  assert.match(redirects, new RegExp(`^/${route} /legal/2026-09-25/${route}/ 301!$`, "m"));
  assert.match(redirects, new RegExp(`^/${route}/ /legal/2026-09-25/${route}/ 301!$`, "m"));
  await assert.rejects(access(new URL(`../public/${route}/index.html`, import.meta.url)));
}
for (const route of ["terms/", "privacy/", "support", "delete-account"]) assert.match(sitemap, new RegExp(`<loc>https:\\/\\/chooseyourhard\\.co\\.uk\\/${route}<\\/loc>`));
for (const [name, document] of [["Terms", terms], ["Privacy", privacy]]) {
  assert.match(document, new RegExp(`${name} (and Conditions|Policy)`));
  assert.match(document, /Version 2026-09-25/);
  assert.match(document, /Effective 25 September 2026/);
  assert.match(document, /SUKHAVATI LTD/);
  assert.match(document, /15497121/);
  assert.doesNotMatch(document, /pre-release|not the final|publication hold/i);
}
assert.notEqual(createHash("sha256").update(terms).digest("hex"), createHash("sha256").update(privacy).digest("hex"));
assert.match(app, /chooseyourharduk@gmail\.com/);
assert.match(app, /navigator\.clipboard\.writeText/);
assert.match(app, /document\.execCommand\("copy"\)/);
assert.match(app, /href="#launch"/);
console.log("Marketing routes, SEO metadata, sitemap, contact email, outcomes, and iOS association verified.");
