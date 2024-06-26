import * as esbuild from "esbuild/wasm.js";
import { denoPlugins } from "esbuild-deno-loader";
import { DOMParser } from "deno-dom/deno-dom-wasm.ts";

async function* filepaths(dir: string): AsyncGenerator<{ type: "file" | "dir"; path: string }> {
  yield { type: "dir", path: dir };
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isFile) {
      yield { type: "file", path };
    } else {
      yield* filepaths(path);
    }
  }
}

const promises = new Array<Promise<void>>();
const entryPoints = new Array<{ in: string; out: string }>();

const [importMap] = await Promise.all([
  Deno.readTextFile("web/dist.importmap"),
  Deno.remove("web/dist", { recursive: true }).catch(() => {}),
]);

for await (const filepath of filepaths("web/src")) {
  const dist = filepath.path.replace(/^web\/src/, "web/dist/src");
  await processPath(filepath, dist);
}

for await (const filepath of filepaths("web/jsx")) {
  const dist = filepath.path.replace(/^web\/jsx/, "web/dist/jsx");
  await processPath(filepath, dist);
}

for await (const filepath of filepaths("shared/src")) {
  const dist = filepath.path.replace(/^shared\/src/, "web/dist/shared");
  await processPath(filepath, dist);
}

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints,
  target: "esnext",
  outdir: ".",
  format: "esm",
  jsxDev: true,
  jsx: "automatic",
  jsxFactory: "jsx",
  jsxImportSource: "jsx",
  absWorkingDir: Deno.cwd(),
  outExtension: { ".js": ".ts" },
});

await Promise.all([
  ...promises,
  ...(result.outputFiles ?? []).map((file) => Deno.writeFile(file.path, file.contents, { create: true })),
]);
await esbuild.stop();

async function processPath(filepath: { type: "file" | "dir"; path: string }, dist: string) {
  if (filepath.type === "dir") {
    await Deno.mkdir(dist, { recursive: true });
    return;
  }
  if (filepath.path.endsWith(".ts") || filepath.path.endsWith(".tsx")) {
    entryPoints.push({ in: filepath.path, out: dist.replace(/\.tsx?$/, "") });
    return;
  }
  promises.push((async () => {
    // If it's a html file, preprocess it to add the importmap
    if (filepath.path.endsWith(".html")) {
      const doc = new DOMParser().parseFromString(await Deno.readTextFile(filepath.path), "text/html");
      const importMapScript = doc.createElement("script");
      importMapScript.setAttribute("type", "importmap");
      importMapScript.textContent = importMap;
      doc.head.prepend(importMapScript);
      await Deno.writeTextFile(dist, `<!DOCTYPE html>\n<html>\n${doc.head.outerHTML}\n${doc.body.outerHTML}\n</html>`);
    } else {
      using file = await Deno.open(filepath.path);
      await Deno.writeFile(dist, file.readable);
    }
  })());
}
