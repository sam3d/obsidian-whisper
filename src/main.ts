import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    let isInitializing = false;
    let isRecording = false;

    let recorder: MediaRecorder | null = null;
    let startTime: number | null = null;

    const el = this.addStatusBarItem();

    let interval: NodeJS.Timer | null = null;

    function updateStatus() {
      if (isInitializing) {
        el.innerText = "Preparing";
        return;
      }

      if (!isRecording) {
        el.innerText = "Whisper Idle";
        return;
      }

      el.innerText = getElapsedTime() ?? "Starting";
    }
    updateStatus();

    function getElapsedTime() {
      if (!startTime) return;

      const now = new Date().getTime();
      const elapsed = now - startTime;
      const totalSeconds = Math.floor(elapsed / 1000);

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return (
        minutes.toString().padStart(2, "0") +
        ":" +
        seconds.toString().padStart(2, "0")
      );
    }

    let chunks: BlobPart[] = [];

    this.addCommand({
      id: "toggle-recording",
      name: "Toggle recording",
      hotkeys: [{ modifiers: ["Alt"], key: "Q" }],
      callback: async () => {
        // Create the recorder
        if (!recorder) {
          isInitializing = true;
          updateStatus();

          const res = await navigator.mediaDevices.enumerateDevices();
          console.log(res.filter((res) => res.kind === "audioinput"));

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

          recorder.addEventListener("dataavailable", (ev) => {
            chunks.push(ev.data);
          });

          recorder.addEventListener("start", (ev) => {
            startTime = new Date().getTime();
            updateStatus();
            interval = setInterval(updateStatus, 100);
          });

          recorder.addEventListener("stop", async (ev) => {
            startTime = null;
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            updateStatus();

            const blob = new Blob(chunks, { type: "audio/webm" });
            chunks = [];

            await this.app.vault.adapter.writeBinary(
              `${new Date().toISOString()}.webm`,
              await blob.arrayBuffer(),
            );
          });

          isInitializing = false;
          updateStatus();
        }

        if (isRecording) recorder.stop();
        else recorder.start();

        isRecording = !isRecording;
        updateStatus();
      },
    });
  }
}
