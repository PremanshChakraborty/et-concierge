const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/handler.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/handler.js",
  external: ["@aws-sdk/*"],
  minify: false,
  sourcemap: true,
  logLevel: "info",
}).catch(() => process.exit(1));
