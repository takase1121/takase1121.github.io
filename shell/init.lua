local function print_results(retval)
  for i, v in ipairs(retval) do
    io.write("[" .. i .. "] = ")
    if type(v) == "nil" then
      io.write("nil")
    elseif type(v) == "string" and #v > 32 then
      io.write(string.format("%q", v:sub(1, 29) .. '...'))
    else
      io.write(tostring(v))
    end
    io.write('\n')
    io.flush()
  end
end

local busybox_commands = busybox.get_supported_commands()
local repl_env = {}
for _, v in ipairs(busybox_commands) do
  repl_env[v] = function(...)
    print(...)
    return busybox.run({ v, ... })
  end
end

local ok, err = xpcall(
  function()
    while true do
      local line = readline.readline("> ", "lua")
      if not line then break end

      local chunk, err = load(line, "REPL", "t", repl_env)
      if chunk then
        local retval = { xpcall(chunk, function(v) return debug.traceback(v, 2) end) }
        if table.remove(retval, 1) then
          print_results(retval)
        else
          print(retval[1])
        end
      else
        print(err)
      end
    end
  end,
  function(v)
    return debug.traceback(v, 2)
  end
)

if not ok then
  print('Fatal lua error: ' .. err)
end
