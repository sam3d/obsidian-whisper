const path = require("path");
const { whisper } = require(path.resolve(
  __dirname,
  "../build/Release/whisper-addon",
));

const whisperParams = {
  language: "en",
  model: "/Users/sam/Documents/Projects/whisper.cpp/models/ggml-medium.en.bin",
  fname_inp: "/Users/sam/Desktop/sample.wav",
};

whisper(whisperParams, (result) => {
  console.log(`Result from whisper: "${result}"`);
});
