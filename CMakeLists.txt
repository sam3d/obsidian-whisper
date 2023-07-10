cmake_minimum_required(VERSION 3.15)

project(whisper)

include(FetchContent)
FetchContent_Declare(
  whisper.cpp
  GIT_REPOSITORY https://github.com/ggerganov/whisper.cpp.git
  GIT_TAG v1.4.2
)
FetchContent_MakeAvailable(whisper.cpp)
