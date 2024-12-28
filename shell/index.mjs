import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { openpty } from "xterm-pty";
import Module from "./shell";

window.addEventListener("load", () => {
  const term = new Terminal({ fontFamily: "IBM Plox Mono", letterSpacing: 0 });
  const fitAddon = new FitAddon();
  const { master, slave } = openpty();

  term.loadAddon(master);
  term.loadAddon(fitAddon);
  term.open(document.getElementById("terminal"));
  fitAddon.fit();

  window.addEventListener("resize", () => fitAddon.fit());

  if (window.WebAssembly) {
    let savedState = {},
      startCount = 0;
    async function run(lastModule, v) {
      if (lastModule?.fail)
        return slave.write(
          "\x1b[31mCritical lua error. Shell will not restart.\x1b[39m\n",
        );
      const moduleObj = {
        pty: slave,
        arguments: ["repl", startCount === 0 ? "--first" : ""],
      };
      moduleObj.onExit = run.bind(this, moduleObj);
      await Module(moduleObj);
      startCount++;
    }
    run();
  } else {
    slave.write(
      "\x1b[31mWebAssembly is blocked by your browser. Enable WebAssembly and refresh the page.\x1b[39m\n",
    );
  }
});
