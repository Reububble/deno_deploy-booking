// deno-lint-ignore-file no-explicit-any
import { IntersectingTypes, UnionTypes } from "shared/type.ts";

type TypeMap = {
  "string": string;
  "number": number;
  "bigint": bigint;
  "boolean": boolean;
  "symbol": symbol;
  "undefined": undefined;
  "object": object;
  // deno-lint-ignore ban-types
  "function": Function;
};

export type Predicate<A, B extends A> = (a: A) => a is B;
export type PredicateOutput<P extends Predicate<any, any>> = P extends Predicate<any, infer B> ? B : never;
export type PredicateInput<P extends Predicate<any, any>> = P extends Predicate<infer A, any> ? A : never;

export type PredicateOutputs<P extends Predicate<any, any>[]> = P extends [infer Head extends Predicate<any, any>, ...infer Tail extends Predicate<any, any>[]]
  ? [PredicateOutput<Head>, ...PredicateOutputs<Tail>]
  : [];
export type PredicateInputs<P extends Predicate<any, any>[]> = P extends [infer Head extends Predicate<any, any>, ...infer Tail extends Predicate<any, any>[]]
  ? [PredicateInput<Head>, ...PredicateInputs<Tail>]
  : [];

export function isValue<const V>(value: V) {
  return (u: unknown): u is V => u === value;
}

export function isInstanceOf<C extends new (...args: any[]) => any>(constructible: C) {
  return <U>(u: U): u is U & InstanceType<C> => u instanceof constructible;
}

export function isType<T extends keyof TypeMap>(typeString: T): Predicate<unknown, TypeMap[T]> {
  // deno-lint-ignore valid-typeof
  return (u: unknown): u is TypeMap[T] => typeof u === typeString; // typeString is a valid type-of
}

export function conformsBoth<A, B extends A, C extends B>(predicateA: Predicate<A, B>, predicateB: Predicate<B, C>) {
  return (a: A): a is C => predicateA(a) && predicateB(a);
}

export function conformsAll<T extends Predicate<any, any>[]>(...predicates: T) {
  return (a: IntersectingTypes<PredicateInputs<T>>): a is IntersectingTypes<PredicateOutputs<T>> => {
    return predicates.every((predicate) => predicate(a));
  };
}

export function conformsAny<T extends Predicate<any, any>[]>(...predicates: T) {
  return (a: UnionTypes<PredicateInputs<T>>): a is UnionTypes<PredicateOutputs<T>> => {
    return predicates.every((predicate) => predicate(a));
  };
}

export function isConformingObject<R extends Record<PropertyKey, Predicate<any, any>>>(structure: R) {
  return <U>(u: U): u is U & { [K in keyof R]: PredicateOutput<R[K]> } =>
    typeof u === "object" && u !== null && Object.entries(structure).every(([key, predicate]) =>
      key in u && predicate(
        (u as {
          [K in keyof R]?: PredicateInput<R[K]>;
        })[key],
      )
    );
}

export function isConformingArray<A, B extends A>(predicate: Predicate<A, B>) {
  return (a: A[]): a is B[] => a.every(predicate); // :)
}
