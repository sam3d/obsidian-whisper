import { MarkdownView, Plugin } from "obsidian";

type RecorderState =
  | { state: "idle" }
  | { state: "initializing" }
  | { state: "recording"; startedAt: number; instance: MediaRecorder }
  | { state: "closing" };

export default class ExamplePlugin extends Plugin {
  private recorder: RecorderState = { state: "idle" };
  private statusBarEl = this.addStatusBarItem();

  async onload() {
    this.renderStatusBar();

    this.addCommand({
      id: "toggle-recording",
      name: "Toggle recording",
      hotkeys: [{ modifiers: ["Alt"], key: "Q" }],
      callback: () => {
        switch (this.recorder.state) {
          case "idle":
            this.startRecording();
            break;

          case "recording":
            this.recorder.instance.stop();
            break;
        }
      },
    });
  }

  private renderStatusBar() {
    const el = this.statusBarEl;

    if (this.recorder.state === "recording") {
      const now = new Date().getTime();
      const elapsed = now - this.recorder.startedAt;

      const totalSeconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      el.innerText =
        minutes.toString().padStart(2, "0") +
        ":" +
        seconds.toString().padStart(2, "0");

      return;
    }

    el.innerText = "Whisper " + this.recorder.state;
  }

  private async startRecording() {
    this.recorder = { state: "initializing" };
    this.renderStatusBar();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    // Save the recording data as it comes in
    const blobParts: BlobPart[] = [];
    recorder.addEventListener("dataavailable", (ev) => blobParts.push(ev.data));

    // A simple interval to reload the timer every second
    let interval: NodeJS.Timer | null = null;

    // When the recorder starts, update the state and put the recorder into it
    // so that it can be stopped from the handler again
    recorder.addEventListener(
      "start",
      () => {
        this.recorder = {
          state: "recording",
          startedAt: new Date().getTime(),
          instance: recorder,
        };
        this.renderStatusBar();

        // Once a second, re-render the status bar to capture the timer
        interval = setInterval(() => this.renderStatusBar(), 1000);
      },
      { once: true },
    );

    // The recorder has been stopped! Clean it up, release the recorder for use,
    // and then save and process the file. This allows us to begin recording
    // before we've finished transcribing an existing recording
    recorder.addEventListener(
      "stop",
      async () => {
        this.recorder = { state: "closing" };
        this.renderStatusBar();

        // We can stop the timer now, we've finished recording
        if (interval) {
          clearInterval(interval);
          interval = null;
        }

        // Release mic and all resources from recorder
        recorder.stream.getTracks().forEach((track) => track.stop());

        // Once we've released the recorder, now we enter the audio processing
        // pipeline. We can free up the recorder for use again
        this.recorder = { state: "idle" };
        this.renderStatusBar();

        // Create blob
        const blob = new Blob(blobParts, { type: "audio/webm" });

        // Save the blob to a file
        await this.app.vault.adapter.writeBinary(
          `${new Date().getTime()}.webm`,
          await blob.arrayBuffer(),
        );

        // Experimental output to text content
        const editor =
          this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (editor) {
          const cursor = editor.getCursor();
          const content = "DEMO CONTENT FROM WHISPER";
          editor.replaceRange(content, cursor);
          editor.setCursor({
            line: cursor.line,
            ch: cursor.ch + content.length,
          });
        }
      },
      { once: true },
    );

    recorder.start();
  }
}
