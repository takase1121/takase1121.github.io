local shell = require "shell"

-- busybox wrapper
local function busybox_wrapper(command)
  return setmetatable({}, {
    __call = function(func, ...)
      return shell.busybox_run({ command, ... })
    end,
    type = "busybox"
  })
end

-- formatting utilities
local fmt = {}
function fmt.bold(f, ...) return string.format("\x1b[1m" .. f .. "\x1b[22m", ...) end
function fmt.italic(f, ...) return string.format("\x1b[3m" .. f .. "\x1b[23m", ...) end
function fmt.underline(f, ...) return string.format("\x1b[4m" .. f .. "\x1b[24m", ...) end
function fmt.redfg(f, ...) return string.format("\x1b[31m" .. f .. "\x1b[39m", ...) end
function fmt.greenfg(f, ...) return string.format("\x1b[32m" .. f .. "\x1b[39m", ...) end
function fmt.yellowfg(f, ...) return string.format("\x1b[33m" .. f .. "\x1b[39m", ...) end

-- prints the result
local function print_result(...)
  local arglist = table.pack(...)
  for i = 1, arglist.n do
    local v = arglist[i]
    if type(v) == "string" and #v > 32 then
      v = string.format("%q", v:sub(1, 29) .. "...")
    else
      v = tostring(v)
    end
    print(fmt.bold("[%d]", i) .. " = " .. v)
  end
end

-- cd command
local cd_command = setmetatable({}, {
  __call = function(o, dir)
    dir = dir or os.getenv("HOME")
    shell.chdir(dir)
  end,
  type = "busybox"
})


-- create an environment for the code created in the REPL
local REPL_ENV = { busybox = busybox_wrapper("busybox"), cd = cd_command }
-- copy all global variables over
for k, v in pairs(_G) do
  REPL_ENV[k] = v
end
-- create a wrapper for all busybox commands
for _, applet in ipairs(shell.busybox_get_commands()) do
  REPL_ENV[applet] = busybox_wrapper(applet)
end

local function print_motd()
  local color, bar = {
    "white", "gray", "red", "yellow", "lime", "aqua", "blue", "fuchsia",
    "silver", "black", "maroon", "olive", "green", "teal", "navy", "purple"
  }, {}
  for i, v in ipairs(color) do
    bar[i] = string.format("[width=2][bgcolor=%s] [/][/]", v)
  end
  shell.bbprintln(string.format([[
[b][lime]Hey there![/][/b]

This doesn't work very well yet, so quell your expectations!
This is a Lua-based shell with busybox. You can run the usual busybox commands,
like ls, cd, tree, echo (sometimes using the [i]wrong[/i] command will crash the shell).
All busybox commands are just Lua functions,
but to make the experience better you can do [b]ls[/b] instead of [b]ls()[/b].

%s
%s

]], table.concat(bar, "", 1, #bar / 2), table.concat(bar, "", (#bar / 2) + 1)))
end


-- A lua REPL based on https://github.com/lua/lua/blob/master/lua.c
local function main()
  if ARGS[3] == "--first" then
    print_motd()
  end

  local multi, status, fn, line
  while true do
    if multi ~= false then
      local cwd = shell.getcwd()
      if cwd:find(os.getenv("HOME"), 1, true) then
        cwd = "~" .. cwd:sub(#os.getenv("HOME") + 1)
      end
      local prompt = multi and "... " or string.format("\\[%s %s]# ", os.getenv("LOGNAME"), cwd)
      line = (multi and (line .. "\n") or "") .. shell.readline(prompt)
    end
    if not line and not multi then
      print("To quit, type " .. fmt.bold("%s", "os.exit()") .. " instead.")
    else
      ::eval_script::
      -- load the script
      if multi == nil then
        -- 'return' trick not tried, load it with 'return' in front
        status, fn = shell.load_ex("return " .. line .. ";", "REPL", "t", REPL_ENV)
      else
        -- 'return' trick tried, load it normally
        status, fn = shell.load_ex(line, "REPL", "t", REPL_ENV)
      end

      if status == "ok" then
        multi = nil
        -- execute it
        local rv = table.pack(xpcall(fn, function(v) return debug.traceback(v, 2) end))
        if rv[1] then
          if (getmetatable(rv[2]) or {}).type == "busybox" then
            -- treat this as a simplified call to busybox commands
            rv[2]()
          else
            print_result(table.unpack(rv, 2, rv.n))
          end
        else
          print(fmt.redfg("%s", rv[2]))
        end
      elseif status == "errsyntax" and multi == nil then
        -- try no-return mode
        multi = false
      elseif status == "errsyntax" and multi == false and fn:match("<eof>$") then
        -- compiler complains about incomplete input, toggle multiline
        multi = true
      else
        multi = nil
        -- other errors not caused by incomplete input
        print(fmt.redfg("%s", fn[1]))
      end
    end
  end -- while true do
end

local ok, err = xpcall(main, function(v) return debug.traceback(v) end)
if not ok then
  print(fmt.redfg("Fatal lua error: %s", err))
end

