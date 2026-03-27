const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/handler.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/handler.js",
  // Mark AWS SDK as external — Lambda runtime provides it, keeps bundle small
  external: [
    "@aws-sdk/*",
  ],
  minify: false,   // keep readable for debugging; set true for production
  sourcemap: true,
  logLevel: "info",
}).catch(() => process.exit(1));
