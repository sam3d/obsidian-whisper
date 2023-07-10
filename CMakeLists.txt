cmake_minimum_required(VERSION 3.15)
set (CMAKE_CXX_STANDARD 11)

project(whisper-addon)

set(WHISPER_COREML ON CACHE INTERNAL "enable Core ML framework")
set(WHISPER_COREML_ALLOW_FALLBACK ON CACHE INTERNAL "allow non-CoreML fallback")

include(FetchContent)

FetchContent_Declare(
  whisper
  GIT_REPOSITORY https://github.com/ggerganov/whisper.cpp.git
  GIT_TAG v1.4.2
)
FetchContent_MakeAvailable(whisper)

FetchContent_Declare(
  dr_libs
  GIT_REPOSITORY https://github.com/mackron/dr_libs
  GIT_TAG e07e2b8264da5fa1331a0ca3d30a3606084c311f
)
FetchContent_Populate(dr_libs)

add_definitions(-DNAPI_VERSION=4)
include_directories(${CMAKE_JS_INC})

add_library(${PROJECT_NAME} SHARED ${CMAKE_JS_SRC} addon.cpp)
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR} ${dr_libs_SOURCE_DIR})

target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} whisper ${CMAKE_THREAD_LIBS_INIT})

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
    # Generate node.lib
    execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()
