import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { openpty } from 'xterm-pty';
import Module from './shell';

window.addEventListener('load', () => {
  const term = new Terminal();
  const fitAddon = new FitAddon();
  const { master, slave } = openpty();

  term.loadAddon(master);
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal'));
  fitAddon.fit();

  slave.write("Hey there! This doesn't work very well, so quell your expectations!\n")
  slave.write("This is a Lua-based shell, so to run your usual commands you need to do\n");
  slave.write("'ls()' instead of 'ls' or 'ls \"-l\"' instead of 'ls -l'.\n");
  slave.write("There's also a bug with input lag; just press the arrow keys.\n\n\n");

  const run = async () => await Module({ pty: slave, onExit: run, arguments: ['repl'] })
  run();
});
