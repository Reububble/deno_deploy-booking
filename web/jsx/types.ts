// Input type for basic tags
export type IntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]:
    & {
      id?: string;
      style?: Partial<CSSStyleDeclaration>;
      className?: string;
      children?: Child | Child[];
    }
    & SpecialAttributes<K>;
};

// The result type
export type Element = InstanceType<typeof Element>;
export const Element = HTMLElement;

type SpecialAttributes<K> = K extends "a" ? { href?: string }
  : K extends "input" ? {
      autoComplete?: "on" | "off";
      type?:
        | "button"
        | "checkbox"
        | "color"
        | "date"
        | "datetime-local"
        | "email"
        | "file"
        | "hidden"
        | "image"
        | "month"
        | "number"
        | "password"
        | "radio"
        | "range"
        | "reset"
        | "search"
        | "submit"
        | "tel"
        | "text"
        | "time"
        | "url"
        | "week";
    }
  : unknown;

type Child = string | Element;
