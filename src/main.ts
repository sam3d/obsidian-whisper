import { Notice, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("dice", "Sample notice", () => {
      new Notice("This is a notice!");
    });
  }
}
