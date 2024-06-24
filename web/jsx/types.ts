// Input type for basic tags
export type IntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]:
    & {
      id?: string;
      style?: Partial<CSSStyleDeclaration>;
      children?: Child | Child[];
    }
    & SpecialAttributes<K>;
};

// The result type
export type Element = InstanceType<typeof Element>;
export const Element = HTMLElement;

type SpecialAttributes<K> = K extends "a" ? { href?: string }
  : unknown;

type Child = string | Element;
