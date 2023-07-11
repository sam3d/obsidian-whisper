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
FetchContent_Declare(
  dr_libs
  GIT_REPOSITORY https://github.com/mackron/dr_libs
  GIT_TAG e07e2b8264da5fa1331a0ca3d30a3606084c311f
)
FetchContent_Populate(dr_libs)

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

# dr_libs/dr_wav is a single file library, not a CMAKE project, so we include it as source
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR} ${dr_libs_SOURCE_DIR})

# whisper.cpp is a CMAKE project, so we can just build it
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} whisper ${CMAKE_THREAD_LIBS_INIT})

# I think this enables builds on windows
if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
    # Generate node.lib
    execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()
