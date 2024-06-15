import { contentType, extensionsByType } from "@deno:std/media_types/mod.ts";

Deno.serve({ port: 8000 }, async (request) => {
  try {
    const url = new URL(request.url);

    const path = "./dist" + url.pathname;
    const file = await retrieveFile(path, request.headers.get("content-type"));

    if (file === undefined) {
      console.log(path, "404");
      return new Response(undefined, { status: 404 });
    }
    console.log(path, file.name, file.type);

    return new Response(file.file.readable, {
      headers: {
        "content-type": file.type,
      },
    });
  } catch (e) {
    console.error("Error", e);
    throw e;
  }
});

async function retrieveFile(path: string, contentType: string | null) {
  let ret = await loadFile(path);
  if (contentType !== null) {
    for (const extension of extensionsByType(contentType) ?? []) {
      ret ??= await loadFile(`${path}.${extension}`);
    }
  }
  ret ??= await loadFile(`${path}.html`);
  ret ??= await loadFile(`${path}/index.html`);
  return ret;
}

async function loadFile(name: string) {
  try {
    const file = await Deno.open(name);
    const stat = await file.stat();
    if (!stat.isFile) {
      throw new Error("Not a file");
    }
    const extension = name.slice(name.lastIndexOf("."));
    const type = extension === ".ts"
      ? "text/javascript"
      : contentType(extension) ?? "application/octet-stream";
    return { name, file, type };
  } catch {
    return;
  }
}
