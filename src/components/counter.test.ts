import { describe, expect, it } from "vitest";
import { setupCounter } from "./counter";

describe("setupCounter", () => {
  it("should increase the counter of a button", () => {
    const button = document.createElement("button");
    button.innerHTML = "count is 0";

    setupCounter(button);

    expect(button.textContent).toEqual("count is 0");

    button.click();

    expect(button.textContent).toEqual("count is 1");
  });
});
