import { MarkdownView, Plugin } from "obsidian";

type RecordingState =
  | { status: "idle" }
  | { status: "initializing" }
  | { status: "recording"; startedAt: number }
  | { status: "closing" };

export default class ExamplePlugin extends Plugin {
  private recorder: MediaRecorder | null = null;
  private recordingState: RecordingState = { status: "idle" };
  private statusBarEl = this.addStatusBarItem();

  async onload() {
    this.renderStatusBar();

    this.addCommand({
      id: "toggle-recording",
      name: "Toggle recording",
      hotkeys: [{ modifiers: ["Alt"], key: "Q" }],
      callback: () => {
        console.log(this.recordingState);
        switch (this.recordingState.status) {
          case "idle":
            this.startRecording();
            break;

          case "recording":
            this.recorder?.stop();
            break;
        }
      },
    });
  }

  private renderStatusBar() {
    const el = this.statusBarEl;

    if (this.recordingState.status === "recording") {
      const now = new Date().getTime();
      const elapsed = now - this.recordingState.startedAt;

      const totalSeconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      el.innerText =
        minutes.toString().padStart(2, "0") +
        ":" +
        seconds.toString().padStart(2, "0");

      return;
    }

    el.innerText = "Whisper " + this.recordingState.status;
  }

  private async startRecording() {
    this.recordingState = { status: "initializing" };
    this.renderStatusBar();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    this.recorder = recorder;

    const blobParts: BlobPart[] = [];

    // A simple interval to reload the timer every second
    let interval: NodeJS.Timer | null = null;

    recorder.addEventListener(
      "start",
      () => {
        this.recordingState = {
          status: "recording",
          startedAt: new Date().getTime(),
        };
        this.renderStatusBar();

        // Once a second, re-render the status bar to capture the timer
        interval = setInterval(() => this.renderStatusBar(), 1000);
      },
      { once: true },
    );

    recorder.addEventListener(
      "stop",
      async () => {
        // We can stop the timer now, we've finished recording
        if (interval) {
          clearInterval(interval);
          interval = null;
        }

        this.recordingState = { status: "closing" };
        this.renderStatusBar();

        // Release mic and all resources from recorder
        recorder.stream.getTracks().forEach((track) => track.stop());
        this.recorder = null;

        // Once we've released the recorder, now we enter the audio processing
        // pipeline. We can free up the recorder for use again
        this.recordingState = { status: "idle" };
        this.renderStatusBar();

        // Create blob
        const blob = new Blob(blobParts, { type: "audio/webm" });

        // Save the blob to a file
        await this.app.vault.adapter.writeBinary(
          `${new Date().getTime()}.webm`,
          await blob.arrayBuffer(),
        );

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

    recorder.addEventListener("dataavailable", (ev) => blobParts.push(ev.data));

    recorder.start();
  }
}
