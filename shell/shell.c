#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "kilo.h"
#include "bestline.h"

const char init_code[] = {
#embed "init.lua"
,'\0'
};

// busybox entrypoint
extern const char applet_names[] __attribute__((aligned(1)));
int lbb_main(char **argv);

// calls the busybox binary, duh
static int f_busybox_run(lua_State *L) {
  lua_settop(L, 1);
  luaL_checktype(L, 1, LUA_TTABLE);
  int len = luaL_len(L, 1);
  // create a table to store the argument as userdata strings
  int arena_idx = (lua_newtable(L), lua_gettop(L));
  char **argv = lua_newuserdata(L, sizeof(char *) * (len + 1)); lua_rawseti(L, arena_idx, 1);
  for (int i = 1; i <= len; i++) {
    size_t len = 0;
    const char *str = (lua_rawgeti(L, 1, i), luaL_checklstring(L, -1, &len));
    char *scpy = lua_newuserdata(L, len); lua_rawseti(L, arena_idx, i + 1);
    memcpy(scpy, str, len);
    argv[i - 1] = scpy;
  }
  argv[len] = NULL;
  // in theory this will give us the busybox return code, but emscripten actually kills the runtime
  // by the point where this function is supposed to return, so well, not exactly possible
  lua_pushinteger(L, lbb_main(argv));
  return 1;
}

static int f_busybox_get_supported_commands(lua_State *L) {
  lua_settop(L, 0);
  lua_newtable(L);
  const char *name = applet_names;
  int i = 1;
  while (*name) {
    int len = strlen(name);
    lua_pushlstring(L, name, len);
    lua_rawseti(L, -2, i);
    name += len + 1;
    i++;
  }
  return 1;
}

static luaL_Reg busybox_lib[] = {
  { "run", f_busybox_run },
  { "get_supported_commands", f_busybox_get_supported_commands },
  { NULL, NULL },
};

static int luaopen_busybox(lua_State *L) {
  luaL_newlib(L, busybox_lib);
  return 1;
}


static int f_readline_readline(lua_State *L) {
  lua_settop(L, 2);
  const char *prompt = luaL_checkstring(L, 1);
  const char *history_file = luaL_checkstring(L, 2);
  char *output = bestlineWithHistory(prompt, history_file);
  if (!output) return 0;
  lua_pushstring(L, output);
  free(output);
  return 1;
}

static luaL_Reg readline_lib[] = {
  { "readline", f_readline_readline },
  { NULL, NULL },
};

static int luaopen_readline(lua_State *L) {
  luaL_newlib(L, readline_lib);
  return 1;
}


static int repl_main(int argc, const char **argv) {
  lua_State *L = luaL_newstate();
  if (!L) {
    fprintf(stderr, "Failed to initialize lua state\n");
    return 1;
  }
  luaL_openlibs(L);
  luaL_requiref(L, "busybox", luaopen_busybox, 1);
  luaL_requiref(L, "readline", luaopen_readline, 1);

  lua_newtable(L);
  for (int i = 0; i < argc; i++) {
    lua_pushstring(L, argv[i]);
    lua_rawseti(L, -2, i + 1);
  }
  lua_setglobal(L, "ARGS");

  if (luaL_dostring(L, init_code) != 0) {
    fprintf(stderr, "fatal lua error: %s\n", lua_tostring(L, -1));
    lua_close(L);
    return 1;
  }
  return 0;
}

int main(int argc, const char **argv) {
  if (argc < 2) {
    fprintf(stderr, "error: no mode specified\n");
    return 1;
  }

  if (strcmp(argv[1], "repl") == 0) {
    return repl_main(argc, argv);
  }
}
