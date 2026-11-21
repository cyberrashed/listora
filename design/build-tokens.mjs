// Writes the colour tokens in tokens.json to the two places that consume them:
// CSS variables for the dashboard and a Dart palette for the app.
//
//   node design/build-tokens.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tokens = JSON.parse(readFileSync(`${root}design/tokens.json`, "utf8"));
const notice =
  "Generated from design/tokens.json by design/build-tokens.mjs. Do not edit.";

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const dartColor = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;

// The dashboard is light only.
const css = [
  `/* ${notice} */`,
  ":root {",
  ...Object.entries(tokens.color.light).map(
    ([name, hex]) => `  --${kebab(name)}: ${hex};`,
  ),
  "}",
  "",
].join("\n");

const names = Object.keys(tokens.color.light);
const palette = (mode) =>
  [
    `  static const ${mode} = Palette(`,
    ...names.map(
      (name) => `    ${name}: ${dartColor(tokens.color[mode][name])},`,
    ),
    "  );",
  ].join("\n");

const dart = [
  `// ${notice}`,
  "import 'dart:ui';",
  "",
  `const fontSans = '${tokens.font.sans}';`,
  "",
  "class Palette {",
  "  const Palette({",
  ...names.map((name) => `    required this.${name},`),
  "  });",
  "",
  ...names.map((name) => `  final Color ${name};`),
  "",
  palette("light"),
  "",
  palette("dark"),
  "}",
  "",
].join("\n");

writeFileSync(`${root}web/src/app/tokens.css`, css);
writeFileSync(`${root}mobile/lib/app/theme/tokens.dart`, dart);
