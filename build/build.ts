import * as esbuild from "esbuild/mod.js";
import { denoPlugins } from "esbuild-deno-loader";
import { DOMParser } from "deno-dom/deno-dom-wasm.ts";

async function* filepaths(dir: string, base: URL): AsyncGenerator<{ type: "file" | "dir"; path: string }> {
  yield { type: "dir", path: dir };
  for await (const entry of Deno.readDir(new URL(dir, base))) {
    const path = `${dir}/${entry.name}`;
    if (entry.isFile) {
      yield { type: "file", path };
    } else {
      yield* filepaths(path, base);
    }
  }
}

const promises = new Array<Promise<void>>();
const entryPoints = new Array<{ in: string; out: string }>();

const [webImportMapString, distImportMapString] = await Promise.all([
  Deno.readTextFile("./web/web.importmap"),
  Deno.readTextFile("./web/dist.importmap"),
  Deno.remove("./dist", { recursive: true }).catch(() => {}),
]);

const distImportMap = JSON.parse(distImportMapString) as unknown;
const webImportMap = JSON.parse(webImportMapString) as unknown;
const isImportMap = (u: unknown): u is { "imports": Record<string, string> } => {
  if (typeof u !== "object" || u === null) {
    return false;
  }
  if (!("imports" in u)) {
    return false;
  }
  if (typeof u.imports !== "object" || u.imports === null) {
    return false;
  }
  for (const key in u.imports) {
    if (typeof u.imports[key as keyof typeof u.imports] !== "string") {
      return false;
    }
  }
  return true;
};
if (!isImportMap(distImportMap) || !isImportMap(webImportMap)) {
  throw new Error("invalid import map");
}

const webImportSpecifiers = new Set(Object.keys(webImportMap.imports));
const distImportSpecifiers = new Set(Object.keys(distImportMap.imports));
if (webImportSpecifiers.size !== distImportSpecifiers.size || !webImportSpecifiers.isSubsetOf(distImportSpecifiers)) {
  throw new Error("inconsistent import maps");
}

const cwd = "file://" + Deno.cwd() + "/";
for (const specifier of webImportSpecifiers) {
  const webURL = new URL(webImportMap.imports[specifier], cwd);
  const distURL = `dist/${distImportMap.imports[specifier]}`;
  if (!specifier.endsWith("/")) {
    await processPath({ type: "file", path: webURL }, distURL);
    continue;
  }
  for await (const filepath of filepaths(".", webURL)) {
    const dist = `${distURL}${filepath.path}`;
    await processPath({ type: filepath.type, path: new URL(filepath.path, webURL) }, dist);
  }
}

await esbuild.build({
  plugins: [...denoPlugins({
    "configPath": new URL("kiosk-web.jsonc", cwd).pathname.slice(1),
  })],
  entryPoints,
  target: "esnext",
  supported: { "using": false },
  outdir: ".",
  format: "esm",
  jsxDev: true,
  jsx: "automatic",
  jsxFactory: "jsx",
  jsxImportSource: "jsx",
  outExtension: {
    ".js": ".ts",
  },
  tsconfigRaw: {
    compilerOptions: {
      experimentalDecorators: true,
    },
  },
  sourcemap: "linked",
  sourcesContent: true,
});

await Promise.all(promises);
await esbuild.stop();

async function processPath(src: { type: "file" | "dir"; path: URL }, dist: string) {
  if (src.type === "dir") {
    await Deno.mkdir(dist, { recursive: true });
    return;
  }
  if (src.path.pathname.endsWith(".ts")) {
    entryPoints.push({ in: src.path.pathname, out: dist.slice(0, -3) });
    return;
  }
  if (src.path.pathname.endsWith(".tsx")) {
    entryPoints.push({ in: src.path.pathname, out: dist.slice(0, -4) });
    return;
  }
  promises.push((async () => {
    // If it's a html file, preprocess it to add the importmap
    if (src.path.pathname.endsWith(".html")) {
      const doc = new DOMParser().parseFromString(await Deno.readTextFile(src.path), "text/html");
      const importMapScript = doc.createElement("script");
      importMapScript.setAttribute("type", "importmap");
      importMapScript.textContent = distImportMapString;
      doc.head.prepend(importMapScript);
      await Deno.writeTextFile(dist, `<!DOCTYPE html>\n<html>\n${doc.head.outerHTML}\n${doc.body.outerHTML}\n</html>`);
    } else {
      using file = await Deno.open(src.path);
      await Deno.writeFile(dist, file.readable);
    }
  })());
}
