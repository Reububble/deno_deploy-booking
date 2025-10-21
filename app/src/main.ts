import { allExtensions, contentType } from "@std/media-types";
import { getCookies, setCookie } from "@std/http/cookie";
import { isConformingArray, isConformingObject, isType } from "shared/typeNarrow.ts";
import { encodeBase64 } from "@std/encoding";
import { checkPassword } from "app/passwordChecks.ts";
import { mondayStart, sundayEnd } from "shared/times.ts";

const isUserObject = isConformingObject({
  created: isType("number"),
  sessions: isConformingArray(isType("string")),
});

const isNewUser = isConformingObject({
  name: isType("string"),
  password: isType("string"),
});

if (import.meta.main) {
  // Init
  const kv = await Deno.openKv();

  const serving = Deno.serve({ port: 8000 }, async (request, info) => {
    // Who's asking?
    const user = await getUser(request, kv);

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
          const sessionData = crypto.getRandomValues(new Uint8Array(128));
          const sessionCookie = encodeBase64(sessionData);
          for (const session in kv.list({ prefix: ["session"] })) {
            if (session === sessionCookie) {
              throw new Error("Wow");
            }
          }
          const atomic = kv.atomic();
          const user = (await kv.get(["user", json.name])).value ?? {
            created: Date.now(),
            sessions: [],
          };
          if (isUserObject(user)) {
            user.sessions.push(sessionCookie);
            kv.set(["user", json.name], user);
          }

          atomic.set(["session", sessionCookie], json.name);
          if (!(await atomic.commit()).ok) {
            throw new Error("Failed to commit");
          }
          const headers = new Headers();
          setCookie(headers, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "Strict",
            secure: true,
            name: "__Host-session",
            value: sessionCookie,
          });
          return new Response(undefined, { status: 200, headers });
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

async function getUser(request: Request, kv: Deno.Kv) {
  const cookies = getCookies(request.headers);
  const sessionCookie = cookies["__Host-session"];
  if (sessionCookie === undefined) {
    return undefined; // No user
  }
  // Find the user
  const name = await kv.get(["session", sessionCookie]);
  if (typeof name.value !== "string") {
    throw new Error("Unexpected session user name");
  }
  const user = await kv.get(["user", name.value]);
  if (!isUserObject(user.value)) {
    throw new Error("Unexpected user object");
  }
  if (user.value.sessions.includes(sessionCookie)) {
    return name.value;
  }
  return undefined;
}

async function retrieveFile(path: string, contentType: string | null) {
  let ret = await loadFile("src/" + path);
  if (contentType !== null) {
    for (const extension of allExtensions(contentType) ?? []) {
      ret ??= await loadFile(`${path}.${extension}`);
    }
  }
  ret ??= await loadFile(`src/${path}.html`);
  ret ??= await loadFile(`src/${path}/index.html`);
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
  const name = "./web/dist/" + path;
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
