// Input type for basic tags
export type IntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]: {
    style?: Partial<CSSStyleDeclaration>;
    children?: Child | Child[];
  } & SpecialAttributes<K>; // TODO add attributes for anything that needs it, e.g input can have type
};

// The result type
export type Element = InstanceType<typeof Element>;
export const Element = HTMLElement;

// Input type for children
export interface ElementChildrenAttribute {
  children: Child | Child[];
}

type SpecialAttributes<K> = K extends "a" ? { href?: string }
  : {};

type Child = string | Element;
