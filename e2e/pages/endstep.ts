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

    if (!label) {
      throw new Error(
        `Cannot sign in as a guest: the account button has the label "${label}".`,
      );
    }

    const username = label.replace(/^Your account:\s*/, "");

    return { username };
  }

  /**
   * Plays a game as a guest against a bot using the specified deck.
   * @param deck The deck list to use for the game.
   * @returns The URL of the game that was started.
   */
  public async playBotGame(deck: string): Promise<URL> {
    await this.page.goto(Endstep.URL);
    await this.page.getByRole("button", { name: /^Play vs bot/ }).click();

    await this.page.waitForURL(/\/lobby\//);

    await this.page
      .getByRole("button", { name: "Choose your deck" })
      .first()
      .click();

    await this.page
      .getByRole("button", {
        name: "Build a new deck",
      })
      .click();

    await this.page.waitForURL(/\/decks\//);

    await this.page
      .getByRole("button", {
        name: "Paste a list",
      })
      .click();

    const dialog = this.page.getByRole("dialog", {
      name: "Paste a list",
    });
    await dialog.getByRole("textbox", { name: "The list" }).fill(deck);
    await dialog.getByRole("button", { name: "Apply" }).click();

    await this.page.getByRole("button", { name: "Untitled, rename" }).click();

    const deckName = this.page.getByRole("textbox", {
      name: "Deck name",
    });
    await deckName.fill("Test deck");
    await deckName.press("Enter");

    await this.page.getByRole("link", { name: "Back to the table" }).click();

    await this.page.waitForURL(/\/lobby\//);

    await this.page
      .getByRole("button", { name: "Choose your deck" })
      .first()
      .click();
    await this.page.getByRole("button", { name: /^Test deck/ }).click();
    await this.page
      .getByRole("button", { name: "Begin with Test deck" })
      .click();

    await this.page.waitForURL(/\/game\//);
    await this.page.getByTestId("game-root").waitFor();

    await this.page.getByRole("button", { name: "Play first" }).click();
    await this.page.getByRole("button", { name: "Keep 7" }).click();
    await this.page.getByRole("button", { name: "Mountain" }).first().click();

    const url = this.page.url();

    return new URL(url);
  }

  /**
   * Concedes the specified game.
   * @param gameUrl  The URL of the game to concede.
   */
  public async concede(gameUrl: URL): Promise<void> {
    await this.page.goto(gameUrl.toString());
    await this.page.getByTestId("game-root").waitFor();

    await this.page.getByRole("button", { name: "Board menu" }).click();
    await this.page
      .getByRole("dialog", { name: "Board menu" })
      .getByRole("button", { name: "Concede" })
      .click();

    await this.page
      .getByRole("dialog", { name: "Concede?" })
      .getByRole("button", { name: "Concede" })
      .click();

    await this.page.getByRole("dialog", { name: "Defeat" }).waitFor();
  }
}
