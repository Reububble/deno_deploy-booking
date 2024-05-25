import * as esbuild from "esbuild/wasm.js";
import { denoPlugins } from "esbuild-deno-loader";

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

for await (const filepath of filepaths("./src")) {
  const dist = filepath.path.replace(/^\.\/src/, "./dist");
  if (filepath.type === "dir") {
    await Deno.mkdir(dist, { recursive: true });
    continue;
  }
  if (filepath.path.endsWith(".ts")) {
    continue;
  }
  promises.push((async () => {
    using file = await Deno.open(filepath.path);
    await Deno.writeFile(dist.replace(/\.ts$/, ".js"), file.readable);
  })());
}

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: [import.meta.resolve("./src/index.ts")],
  outdir: "./dist",
  bundle: true,
  format: "esm",
  minify: true,
});

await Promise.all([...promises, ...(result.outputFiles ?? []).map((file) => Deno.writeFile("." + file.path, file.contents, { create: true }))]);
await esbuild.stop();
