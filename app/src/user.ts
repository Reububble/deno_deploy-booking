import { encodeBase64 } from "@std/encoding/base64";
import { getCookies, setCookie } from "@std/http/cookie";
import { isConformingArray, isConformingObject, isType } from "shared/typeNarrow.ts";

const isUserObject = isConformingObject({
  created: isType("number"),
  sessions: isConformingArray(isType("string")),
});

export class UserManager {
  readonly kv: Deno.Kv;
  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }
  async newUser(name: string) {
    const sessionData = crypto.getRandomValues(new Uint8Array(128));
    const sessionCookie = encodeBase64(sessionData);
    for (const session in this.kv.list({ prefix: ["session"] })) {
      if (session === sessionCookie) {
        throw new Error("Wow");
      }
    }
    const atomic = this.kv.atomic();
    const user = (await this.kv.get(["user", name])).value ?? {
      created: Date.now(),
      sessions: [],
    };
    if (isUserObject(user)) {
      user.sessions.push(sessionCookie);
      this.kv.set(["user", name], user);
    }

    atomic.set(["session", sessionCookie], name);
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
  async getUser(request: Request) {
    const cookies = getCookies(request.headers);
    const sessionCookie = cookies["__Host-session"];
    if (sessionCookie === undefined) {
      return undefined; // No user
    }
    // Find the user
    const name = await this.kv.get(["session", sessionCookie]);
    if (typeof name.value !== "string") {
      throw new Error("Unexpected session user name");
    }
    const user = await this.kv.get(["user", name.value]);
    if (!isUserObject(user.value)) {
      throw new Error("Unexpected user object");
    }
    if (user.value.sessions.includes(sessionCookie)) {
      return name.value;
    }
    return undefined;
  }
}
