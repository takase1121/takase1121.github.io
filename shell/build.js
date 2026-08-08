const esbuild = require('esbuild');

// build runcontainer stack-worker.js
const c2wSrc = `${__dirname}/src/container2wasm/extras/runcontainerjs/src/web`;
esbuild.build({
  entryPoints: [`${c2wSrc}/stack-worker.js`, `${c2wSrc}/worker-util.js`],
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  outdir: 'build/runcontainer',
});


// build index and sw
esbuild.build({
  entryPoints: ['src/index.js', 'src/sw.js'],
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  outdir: 'build',
  alias: {
    '@runcontainer': `${c2wSrc}/runcontainer.js`,
  }
});