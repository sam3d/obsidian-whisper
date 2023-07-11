cmake_minimum_required(VERSION 3.15)
set (CMAKE_CXX_STANDARD 11) # Fix build on macOS

project(whisper-addon)

add_definitions(-DNAPI_VERSION=4)
include_directories(${CMAKE_JS_INC})

# Force whisper CMAKE file to have Core ML enabled
set(WHISPER_COREML ON CACHE INTERNAL "Enable Core ML framework")
set(WHISPER_COREML_ALLOW_FALLBACK ON CACHE INTERNAL "Allow non-CoreML fallback")

include(FetchContent)

# Get whisper dependency
FetchContent_Declare(
  whisper
  GIT_REPOSITORY https://github.com/ggerganov/whisper.cpp.git
  GIT_TAG v1.4.2
)
FetchContent_MakeAvailable(whisper)

# Get wav parser dependency
set(
    DR_WAV_URL
    "https://raw.githubusercontent.com/mackron/dr_libs/e07e2b8264da5fa1331a0ca3d30a3606084c311f/dr_wav.h"
)
set(DR_WAV_LOCATION "${CMAKE_BINARY_DIR}/includes/dr_wav.h")
if(NOT EXISTS "${DR_WAV_LOCATION}")
    file(DOWNLOAD "${DR_WAV_URL}" "${DR_WAV_LOCATION}")
endif()

# Load source files and set output mode
add_library(${PROJECT_NAME} SHARED src/addon.cpp ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Include the NAPI headers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

# dr_wav is a single file header we downloaded, so we just include it
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR} ${CMAKE_BINARY_DIR}/includes)

# whisper.cpp is a CMAKE project, so we can just build it
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} whisper ${CMAKE_THREAD_LIBS_INIT})

# I think this enables builds on windows
if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
    # Generate node.lib
    execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()
