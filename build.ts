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
const entryPoints = new Array<{ in: string; out: string }>();

await Deno.remove("./src/imports.ts").catch(() => {});

for await (const filepath of filepaths("./src")) {
  const dist = filepath.path.replace(/^\.\/src/, "./dist");
  if (filepath.type === "dir") {
    await Deno.mkdir(dist, { recursive: true });
    continue;
  }
  if (filepath.path.endsWith(".ts")) {
    entryPoints.push({ in: filepath.path, out: dist.replace(/^.\/dist\//, "./").replace(/\.ts$/, "") });
    continue;
  }
  promises.push((async () => {
    using file = await Deno.open(filepath.path);
    await Deno.writeFile(dist, file.readable);
  })());
}

{
  const imports = JSON.stringify(Object.fromEntries(entryPoints.map(({ out }) => [out.slice(1) + ".ts", out.slice(1) + ".js"])));
  const template = await Deno.readTextFile("./imports.ts");
  await Deno.writeTextFile("./src/imports.ts", `const imports = ${imports};\n${template}`);
  entryPoints.push({ in: "./src/imports.ts", out: "./imports" });
}

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints,
  outdir: "./dist",
  format: "esm",
  absWorkingDir: Deno.cwd(),
});

await Deno.remove("./src/imports.ts");

await Promise.all([
  ...promises,
  ...(result.outputFiles ?? []).map((file) => {
    Deno.writeFile(file.path, file.contents, { create: true });
  }),
]);
await esbuild.stop();
