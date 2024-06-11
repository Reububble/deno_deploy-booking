/// <reference lib="deno.ns"/>

import { contentType } from "@deno:std/media_types/mod.ts";

Deno.serve({ port: 8000 }, async (request) => {
  try {
    const url = new URL(request.url);

    const path = "./dist" + url.pathname;
    const file = await retrieveFile(path);

    if (file === undefined) {
      console.log(path, "404");
      return new Response(undefined, { status: 404 });
    }
    const type = contentType(file.name.slice(file.name.lastIndexOf("."))) ?? "application/octet-stream";
    console.log(path, file.name, type);

    return new Response(file.file.readable, {
      headers: {
        "content-type": type,
      },
    });
  } catch (e) {
    console.error("Error", e);
    throw e;
  }
});

async function retrieveFile(path: string) {
  return await loadFile(path) ?? await loadFile(`${path}/index.html`);
}

async function loadFile(name: string) {
  try {
    const file = await Deno.open(name);
    const stat = await file.stat();
    if (!stat.isFile) {
      throw new Error("Not a file");
    }
    return { name, file };
  } catch {
    return;
  }
}
