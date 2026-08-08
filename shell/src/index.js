import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { openpty } from 'xterm-pty';
import { createContainerQEMUWasm } from '@runcontainer';

import './index.css';
import '@xterm/xterm/css/xterm.css';

async function main() {
    const modalElement = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const modalOkBtn = document.getElementById('modal-ok');

    // pre check WASM, SHM and Service Worker
    if (!window.WebAssembly || !window.SharedArrayBuffer || !navigator.serviceWorker) {
        modalTitle.textContent = 'Unsupported Environment';
        modalContent.textContent = 'Your browser does not support WebAssembly, SharedArrayBuffer and/or Service Workers, which are needed for this functionality.';
        modalOkBtn.style.display = 'none';
        modalCancelBtn.style.display = 'block';
        modalCancelBtn.textContent = 'Back';
        modalCancelBtn.addEventListener('click', () => {
            window.location.href = window.location.origin;
        });
        return;
    }

    // install service worker
    modalTitle.textContent = 'Service Worker';
    modalContent.textContent = 'Installing Service Worker. You will be prompted to reload the page to complete the installation.';
    modalOkBtn.style.display = 'none';
    modalCancelBtn.style.display = 'none';

    // prompt user refresh when installed
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        modalTitle.textContent = 'Service Worker';
        modalContent.textContent = 'Please reload the page to complete the installation.';
        modalCancelBtn.style.display = 'none';
        modalOkBtn.textContent = 'Reload';
        modalOkBtn.style.display = 'block';
        modalOkBtn.addEventListener('click', () => {
            window.location.reload();
        }, { once: true });
    });

    const registration = await navigator.serviceWorker.register('sw.js');
    if (navigator.serviceWorker.controller && (await fetch(window.location.href + '/sw-ping')).ok) {
        // ready to download
        modalTitle.textContent = 'Content Download';
        modalContent.innerHTML = 'This functionality requires downloading around <strong>100 to 150 MB</strong> of data to work (WASM + container image). Do you want to proceed?';
        modalCancelBtn.style.display = 'block';
        modalOkBtn.style.display = 'block';
        modalCancelBtn.addEventListener('click', () => {
            window.location.href = window.location.origin;
        });
        modalOkBtn.addEventListener('click', () => {
            modalElement.classList.add('hidden');
            mainWasm();
        });
    }
}

async function mainWasm() {

    const statusDotElement = document.getElementById('status-dot');
    const statusTextElement = document.getElementById('status-text');
    const currentFileElement = document.getElementById('current-file');
    const totalTxElement = document.getElementById('total-tx');
    const wasmTxElement = document.getElementById('wasm-tx');
    const blobTxElement = document.getElementById('blob-tx');

    if (navigator.serviceWorker) {
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            if (i === 0) return `${bytes} B`;
            return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
        };

        navigator.serviceWorker.addEventListener('message', (event) => {
            const body = event.data;
            if (body.type === 'tx-stats') {
                const stat = body.response;
                currentFileElement.textContent = `(${stat.currentFile})`;
                totalTxElement.textContent = `${formatBytes(stat.blobInFlightTx + stat.wasmInFlightTx)} / ${formatBytes(stat.blobTx + stat.wasmTx)} transferred`;
                wasmTxElement.textContent = `${formatBytes(stat.wasmInFlightTx)} / ${formatBytes(stat.wasmTx)}`;
                blobTxElement.textContent = `${formatBytes(stat.blobInFlightTx)} / ${formatBytes(stat.blobTx)}`;
            }
        });
    }


    const xterm = new Terminal();
    xterm.open(document.getElementById("terminal"));

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    requestAnimationFrame(() => setTimeout(() => fitAddon.fit(), 50));
    window.addEventListener('resize', () => fitAddon.fit());

    const { master, slave } = openpty();
    xterm.loadAddon(master);

    let Module = {};
    Module.pty = slave;
    var readableCallbacks = [];
    Module.pty.onReadable(() => {
        readableCallbacks.forEach(cb => cb());
        readableCallbacks = [];
    });
    Module['preRun'] = [];
    Module['preRun'].push((Module) => {
        Module['TTY'].stream_ops.poll = (stream, timeout, notifyCallback) => {
            if (Module.pty.readable) {
                return 1;
            }
            if (notifyCallback != null) {
                notifyCallback.registerCleanupFunc(() => {
                    const i = readableCallbacks.indexOf(notifyCallback);
                    if (i != -1) readableCallbacks.splice(i, 1);
                });
                readableCallbacks.push(notifyCallback);
            }
            return 0;
        };
        // // add filesystem
        const FS = Module['FS'];
        FS.mkdir('/host');
        FS.writeFile('/host/.init-done', '0');
    });


    let stop = false;
    const vmImage = `${window.location.origin}${window.location.pathname}/vm`;
    const argModuleJsAddr = vmImage + "/arg-module.js";
    const outJsAddr = vmImage + "/out.js";
    const loadJsAddr = vmImage + "/load.js";
    const mounterImage = `${window.location.origin}${window.location.pathname}/imagemounter.wasm.gzip`;
    const stackWorkerFile = `${window.location.origin}${window.location.pathname}/runcontainer/stack-worker.js`;
    const containerImageAddress = `${window.location.origin}${window.location.pathname}/oci-image/`;
    const options = {
        extraInfo: 'm: /host\n'
    }

    try {
        setStatus('idle', 'Starting container...');
        Module = await createContainerQEMUWasm(Module, outJsAddr, containerImageAddress, stackWorkerFile, mounterImage, argModuleJsAddr, loadJsAddr, (p) => vmImage + "/" + p, options);
        pollVmStatus();
    } catch (error) {
        setStatus('fail', `Failed to start VM: ${error}`);
        stop = true;
    }

    function pollVmStatus() {
        try {
            const content = Module['FS'].readFile('/host/.init-done', { encoding: 'utf8' });
            if (content.includes('1'))
                return setStatus('ok', 'Running');
            else if (!stop)
                return setTimeout(pollVmStatus, 100);
        } catch (error) {
            console.log("cannot check VM status: ", error);
        }
    }

    function setStatus(severity, content) {
        statusDotElement.classList.remove('ok', 'fail', 'idle');
        statusDotElement.classList.add(severity);
        statusTextElement.classList.remove('ok', 'fail', 'idle');
        statusTextElement.classList.add(severity);
        statusTextElement.textContent = content;
    }
}

window.addEventListener('load', main);