import { expect, test } from "vitest";

test("add", () => {
  const add = (a: number, b: number) => a + b;
  expect(add(5, 10)).toBe(15);
  expect(add(0, 0)).toBe(0);
  expect(add(-5, 10)).toBe(5);
});
