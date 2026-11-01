import type { Page } from "@playwright/test";

export type Guest = {
  username: string;
};

/**
 * Represents the Endstep web application and provides methods to interact with it.
 */
export class Endstep {
  public static readonly URL = "https://endstep.cc/";

  constructor(public page: Page) {}

  /**
   * Signs in as a guest user.
   * @returns The guest user object containing the username.
   */
  public async signInAsGuest(): Promise<Guest> {
    await this.page.goto(Endstep.URL);
    await this.page.getByRole("button", { name: "Play as a guest" }).click();

    const label = await this.page
      .getByRole("button", { name: /^Your account: guest_/ })
      .getAttribute("aria-label");

    const username = label?.replace(/^Your account:/gi, "") ?? "";

    return { username };
  }
}
