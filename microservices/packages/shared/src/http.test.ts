import { describe, it, expect } from "vitest";
import { ok, err } from "./http";

describe("http envelopes", () => {
  it("ok wraps data with success:true", () => {
    expect(ok({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });
  it("err wraps a message with success:false", () => {
    expect(err("nope")).toEqual({ success: false, error: "nope" });
  });
});
