import { Element } from "./types.ts";

export function jsxDEV(tag: unknown, props?: unknown, ...children: unknown[]): Element {
  if (typeof tag === "string") {
    return document.createElement(tag);
  } else if (typeof tag === "function") {
    const ret = tag();
    if (!(ret instanceof Element)) {
      throw new Error("Function didn't return Element type");
    }
    return ret;
  }
  throw new Error("tag cannot create an Element");
}

export * as JSX from "./types.ts";
