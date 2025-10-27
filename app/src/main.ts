import { allExtensions, contentType } from "@std/media-types";
import { isConformingObject, isType } from "shared/typeNarrow.ts";
import { checkPassword } from "app/passwordChecks.ts";
import { mondayStart, sundayEnd } from "shared/times.ts";
import { UserManager } from "./user.ts";

const isNewUser = isConformingObject({
  name: isType("string"),
  password: isType("string"),
});

if (import.meta.main) {
  // Init
  const kv = await Deno.openKv();
  const userManager = new UserManager(kv);

  const serving = Deno.serve({ port: 8000 }, async (request, info) => {
    // Who's asking?
    const user = await userManager.getUser(request);

    try {
      const url = new URL(request.url);

      switch (url.pathname) {
        case "/api/bookings": {
          if (user === undefined) {
            return new Response(undefined, { status: 401 });
          }
          const start = Number(url.searchParams.get("start") ?? mondayStart());
          const end = Number(url.searchParams.get("end") ?? sundayEnd());

          const firstStart = (await kv.list<number>({ start: ["bookings", "end", start], end: ["bookings", "end", end] }).next()).value?.value ?? start;
          const starts = kv.list<{
            name: string;
            end: number;
          }>({ start: ["bookings", "start", firstStart], end: ["bookings", "start", end] });

          return new Response(JSON.stringify(
            (await Array.fromAsync(starts)).map((entry) => ({ ...entry.value, start: entry.key[2] })),
          ));
        }
        case "/api/user": {
          if (request.method !== "POST") {
            return new Response(undefined, { status: 404 });
          }
          if (request.body === null) {
            return new Response(undefined, { status: 400 });
          }
          const json = await request.json() as unknown;
          if (!isNewUser(json)) {
            return new Response(undefined, { status: 400 });
          }
          if (!await checkPassword(json.password)) {
            return new Response(undefined, { status: 401 });
          }
          return userManager.newUser(json.name);
        }
      }

      const path = url.pathname;
      const file = await retrieveFile(path, request.headers.get("content-type"));

      if (file === undefined) {
        console.log(path, "404");
        return new Response(undefined, { status: 404 });
      }
      console.log(path, file.name, file.type);

      info.completed.then(() => {
        try {
          file.file.close();
        } catch { /** Do nothing */ }
      });

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

  console.log("initialised");

  await serving.finished;
}

async function retrieveFile(path: string, contentType: string | null) {
  let ret = await loadFile(path);
  if (contentType !== null) {
    for (const extension of allExtensions(contentType) ?? []) {
      ret ??= await loadFile(`${path}.${extension}`);
    }
  }
  ret ??= await loadFile(`${path}.html`);
  ret ??= await loadFile(`${path}/index.html`);
  ret ??= await loadFile(path);
  if (contentType !== null) {
    for (const extension of allExtensions(contentType) ?? []) {
      ret ??= await loadFile(`${path}.${extension}`);
    }
  }
  ret ??= await loadFile(`${path}.html`);
  ret ??= await loadFile(`${path}/index.html`);
  return ret;
}

async function loadFile(path: string) {
  const name = "public/" + path;
  try {
    const file = await Deno.open(name);
    const stat = await file.stat();
    if (!stat.isFile) {
      throw new Error("Not a file");
    }
    const extension = name.slice(name.lastIndexOf("."));
    const type = extension === ".ts" ? "text/javascript" : contentType(extension) ?? "application/octet-stream";
    return { name, file, type };
  } catch {
    return;
  }
}
