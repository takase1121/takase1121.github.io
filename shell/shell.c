#define _POSIX_C_SOURCE 200809L

#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>

#include "kilo.h"
#include "isocline.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#define READLINE_HISTORY_FILE "/home/web_user/.luarepl_history"
#define CWD_FILE "/home/web_user/.cwd"

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
    memcpy(scpy, str, len + 1); // lua strings (binary or not) always has a delimiter that should be copied
    argv[i - 1] = scpy;
  }
  argv[len] = NULL;
  // we can't rely on busybox not calling exit() and just killing the entire program,
  // so we need to store whatever state that we have into JS and hopefully that gets restored before we run
  char *cwd = getcwd(NULL, 0);
  int cwd_file = creat(CWD_FILE, S_IWUSR | S_IRUSR);
  write(cwd_file, cwd, strlen(cwd));
  close(cwd_file);
  free(cwd);

  lua_pushinteger(L, lbb_main(argv));
  return 1;
}

static int f_busybox_get_commands(lua_State *L) {
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

static int f_readline(lua_State *L) {
  lua_settop(L, 2);
  const char *prompt = luaL_checkstring(L, 1);

  ic_set_prompt_marker("", "");
  ic_enable_multiline(0);

  char *output = ic_readline(prompt);
  if (!output) return 0;
  lua_pushstring(L, output);
  free(output);
  return 1;
}

static int f_load_ex(lua_State *L) {
  size_t len = 0;
  lua_settop(L, 4);
  const char *content = luaL_checklstring(L, 1, &len);
  const char *chunkname = luaL_optstring(L, 2, content);
  const char *chunkmode = luaL_optstring(L, 3, "bt");
  int env = lua_isnone(L, 4) ? 0 : 4;

  int result = luaL_loadbufferx(L, content, len, chunkname, chunkmode);
  if (result == LUA_OK && env) {
    lua_pushvalue(L, env);
    if (!lua_setupvalue(L, -2, 1))
      lua_pop(L, 1);
  }
  // insert result before error messages
  switch (result) {
    case LUA_OK: lua_pushliteral(L, "ok"); break;
    case LUA_ERRSYNTAX: lua_pushliteral(L, "errsyntax"); break;
    case LUA_ERRRUN: lua_pushliteral(L, "errrun"); break;
    case LUA_ERRMEM: lua_pushliteral(L, "errmem"); break;
    case LUA_ERRFILE: lua_pushliteral(L, "errfile"); break;
    default: lua_pushliteral(L, "errunknown"); break;
  }
  lua_insert(L, -2);
  return 2;
}

static int f_bbprintln(lua_State *L) {
  ic_println(luaL_checkstring(L, 1));
  return 0;
}

static int f_chdir(lua_State *L) {
  lua_settop(L, 1);
  const char *d = luaL_checkstring(L, 1);
  if (chdir(d) == 0) return 0;
  return luaL_error(L, "chdir(): %s", strerror(errno));
}

static int f_getcwd(lua_State *L) {
  lua_settop(L, 0);
  char *d = getcwd(NULL, 0);
  if (!d) luaL_error(L, "getcwd(): %s", strerror(errno));
  lua_pushstring(L, d);
  free(d);
  return 1;
}

static luaL_Reg lib[] = {
  { "busybox_run", f_busybox_run },
  { "busybox_get_commands", f_busybox_get_commands },
  { "readline", f_readline },
  { "load_ex", f_load_ex },
  { "bbprintln", f_bbprintln },
  { "chdir", f_chdir },
  { "getcwd", f_getcwd },
  { NULL, NULL },
};

static int luaopen_shell(lua_State *L) {
  luaL_newlib(L, lib);
  return 1;
}


static int repl_main(int argc, const char **argv) {
  lua_State *L = luaL_newstate();
  if (!L) {
    fprintf(stderr, "Failed to initialize lua state\n");
    return 1;
  }

  luaL_openlibs(L);
  luaL_requiref(L, "shell", luaopen_shell, 0);

  lua_newtable(L);
  for (int i = 0; i < argc; i++) {
    lua_pushstring(L, argv[i]);
    lua_rawseti(L, -2, i + 1);
  }
  lua_setglobal(L, "ARGS");

  if (luaL_loadbuffer(L, init_code, (sizeof(init_code) / sizeof(*init_code)) - 1, "init.lua") != LUA_OK
      || lua_pcall(L, 0, 0, 0) != LUA_OK) {
    fprintf(stderr, "error: %s\n", lua_tostring(L, -1));
    lua_close(L);
    return 1;
  }
  lua_close(L);
  return 0;
}


#ifdef __EMSCRIPTEN__
// initialize the idbfs persistence filesystem
EM_ASYNC_JS(void, idbfs_init, (void), {
  await new Promise((res, rej) => {
    if (!FS.analyzePath("/home")?.exists) FS.mkdir("/home");
    if (!FS.analyzePath("/home/web_user")?.exists) FS.mkdir("/home/web_user");
    FS.mount(IDBFS, { autoPersist: true }, "/home/web_user");
    FS.syncfs(true, err => {
      if (err) console.error(err);
      res();
    });
  });
})
#endif

int main(int argc, const char **argv) {
  if (argc < 2) {
    fprintf(stderr, "error: no mode specified\n");
    return 1;
  }

#ifdef __EMSCRIPTEN__
  // mount persistence fs
  idbfs_init();
#endif

  // restore cwd
  char cwd[PATH_MAX] = { 0 };
  int cwd_file = open(CWD_FILE, O_RDONLY, S_IWUSR | S_IRUSR);
  read(cwd_file, cwd, PATH_MAX - 1);
  close(cwd_file);
  chdir(cwd[0] != '\0' ? cwd : getenv("HOME"));

  // set readline history
  ic_set_history(READLINE_HISTORY_FILE, -1);

  if (strcmp(argv[1], "repl") == 0) {
    if (repl_main(argc, argv) != 0) {
#ifdef __EMSCRIPTEN__
      EM_ASM(Module["fail"] = true);
#endif
      exit(1);
    }
    exit(0);
  }
  exit(1);
}
