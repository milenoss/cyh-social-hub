import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const aasa = JSON.parse(await readFile(new URL("../public/.well-known/apple-app-site-association", import.meta.url), "utf8"));

for (const route of ["/terms", "/privacy", "/support", "/delete-account", "/join/:code"]) {
  assert.match(app, new RegExp(`path=\\"${route.replace("/", "\\/")}\\"`));
}
for (const outcome of ["done", "adapted", "recovery", "missed"]) assert.match(app, new RegExp(`${outcome}:`));
assert.equal(aasa.applinks.details[0].appID, "ZB35TCWHV6.com.milen.chooseyourhard");
assert.deepEqual(aasa.applinks.details[0].paths, ["/join/*"]);
console.log("Marketing routes, check-in outcomes, and iOS association verified.");
