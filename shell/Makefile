CC = emcc
CFLAGS += -DKILO_USE_ENTRYPOINT -DMAKE_LIB \
	-Ilua -Ikilo -Ibestline \
	-sASYNCIFY -sMODULARIZE -sASYNCIFY_STACK_SIZE=10248 -sEXIT_RUNTIME=1 -sENVIRONMENT=web -flto -O3 \
	--js-library=node_modules/xterm-pty/emscripten-pty.js

.PHONY: clean all

all: index.min.js index.min.css

shell.js: shell.c bestline/bestline.c lua/onelua.c libbusybox.so init.lua
	$(CC) -o $@ $(CFLAGS) -Wall -std=c23 shell.c bestline/bestline.c lua/onelua.c libbusybox.so -flto

busybox-build/emgcc:
	mkdir -p busybox-build && cd busybox-build && \
	ln -fs "$$(realpath --relative-to=. "$$(which emcc.py)")" emgcc && \
	chmod +x emgcc

libbusybox.so: busybox-build/emgcc busybox_config
	-cd busybox && git apply ../0001-fix-busybox-not-compiling-on-wasm.patch
	rsync -aq busybox_config busybox/.config
	PATH="$$PWD/busybox-build:$$PATH" $(MAKE) -C busybox ARCH=em CROSS_COMPILE=em SKIP_STRIP=y -j $$(nproc)
	cp busybox/0_lib/libbusybox.so.1.37.0_unstripped $@
	-cd busybox && git apply -R ../0001-fix-busybox-not-compiling-on-wasm.patch

index.min.js: index.mjs shell.js
	npm run build:js

index.min.css: index.css
	npm run build:css

clean:
	rm -f shell.js shell.wasm libbusybox.so index.min.js index.min.css
