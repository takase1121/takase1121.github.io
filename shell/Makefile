CC = emcc
CFLAGS += -std=gnu23 -O3
LDFLAGS += \
	-sASYNCIFY \
	-sMODULARIZE \
	-sASYNCIFY_STACK_SIZE=10248 \
	-sEXIT_RUNTIME=1 \
	-sENVIRONMENT=web \
	--js-library=node_modules/xterm-pty/emscripten-pty.js \
	-lidbfs.js

OBJS = shell.o lua.o isocline.o busybox.wasm


.PHONY: clean all busybox-menuconfig format

all: index.min.js index.min.css

shell.js: $(OBJS)
	$(CC) -o $@ $^ $(LDFLAGS)

shell.o: shell.c init.lua
	$(CC) -o $@ -c $(CFLAGS) -Wall -pedantic -Ilua -Iisocline/include -Ikilo $<

lua.o: lua/onelua.c
	$(CC) -o $@ -c $(CFLAGS) -Ilua -DMAKE_LIB $<

isocline.o: isocline/src/isocline.c isocline/include/isocline.h
	$(CC) -o $@ -c $(CFLAGS) -Iisocline/include $<

busybox.wasm: busybox_config
	-cd busybox && git apply ../0001-fix-busybox-not-compiling-on-wasm.patch
	rsync -aq busybox_config busybox/.config
	$(MAKE) -C busybox CC=emcc ARCH=em CROSS_COMPILE=em SKIP_STRIP=y -j $$(nproc)
	cp busybox/0_lib/libbusybox.so.1.37.0_unstripped $@
	-cd busybox && git apply -R ../0001-fix-busybox-not-compiling-on-wasm.patch

index.min.js: index.mjs shell.js
	npm run build:js

index.min.css: index.css
	npm run build:css

busybox-menuconfig:
	-cd busybox && git apply ../0001-fix-busybox-not-compiling-on-wasm.patch
	cd busybox && make menuconfig
	-cd busybox && git apply -R ../0001-fix-busybox-not-compiling-on-wasm.patch

format:
	npm run format

clean:
	rm -f shell.js shell.wasm index.min.js index.min.css index.min.js.map index.min.css.map $(OBJS)
