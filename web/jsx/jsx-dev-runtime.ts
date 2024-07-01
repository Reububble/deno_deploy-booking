import { Element } from "./types.ts";

function createElement(tag: unknown) {
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

export function jsxDEV(tag: unknown, props: unknown, children: unknown[] | undefined, bool: boolean, file: {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}): Element {
  const element = createElement(tag);

  if (props !== undefined && typeof props !== "object") {
    throw new Error("props is not an object");
  }

  for (const propKey in props) {
    const prop = (props as { [k: string]: any })[propKey];
    switch (propKey) {
      case "style":
        for (const key in prop) {
          element.style[key as Exclude<keyof CSSStyleDeclaration, "length" | "parentRule">] = prop[key];
        }
        break;
      case "className":
        element.className = String(prop);
        break;
      case "children":
        children = prop;
        break;
      default:
        switch (typeof prop) {
          case "string":
            element.setAttribute(propKey, prop);
            break;
          case "boolean":
            element.toggleAttribute(propKey, prop);
            break;
          case "undefined":
            element.toggleAttribute(propKey, false);
            break;
          default:
            element.setAttribute(propKey, String(prop));
        }
    }
  }

  if (children !== undefined) {
    if (!Array.isArray(children)) {
      children = [children];
    }
    if (!children.every((child): child is string | Element => typeof child === "string" || child instanceof Element)) {
      throw new Error("Not every child is string or element");
    }

    element.replaceChildren(...children);
  }

  return element;
}

export * as JSX from "./types.ts";
