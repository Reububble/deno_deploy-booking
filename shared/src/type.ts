// deno-lint-ignore-file no-explicit-any
export type IntersectingTypes<T extends any[], A = unknown> = T extends [infer Head, ...infer Tail] ? IntersectingTypes<Tail, A & Head> : A;
export type UnionTypes<T extends any[]> = T[number];
