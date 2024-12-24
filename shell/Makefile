CC = emcc
NPM ?= npm
CP ?= cp
INSTALL ?= install
GIT ?= git
RM ?= rm -f
DESTDIR ?= install

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


.PHONY: clean all busybox-menuconfig format install

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
	-cd busybox && $(GIT) apply ../0001-fix-busybox-not-compiling-on-wasm.patch
	$(CP) -a busybox_config busybox/.config
	$(MAKE) -C busybox CC=emcc ARCH=em CROSS_COMPILE=em SKIP_STRIP=y
	$(CP) busybox/0_lib/libbusybox.so.1.37.0_unstripped $@
	-cd busybox && $(GIT) apply -R ../0001-fix-busybox-not-compiling-on-wasm.patch

index.min.js: index.mjs shell.js
	$(NPM) run build:js -- --outdir=.

index.min.css: index.css
	$(NPM) run build:css -- --outdir=.

busybox-menuconfig:
	-cd busybox && $(GIT) apply ../0001-fix-busybox-not-compiling-on-wasm.patch
	cd busybox && $(MAKE) menuconfig
	-cd busybox && $(GIT) apply -R ../0001-fix-busybox-not-compiling-on-wasm.patch

format:
	$(NPM) run format

install: all
	$(INSTALL) -D index.html $(DESTDIR)/index.html
	$(INSTALL) -D shell.wasm $(DESTDIR)/shell.wasm
	$(NPM) run build:js -- --outdir=$(DESTDIR)
	$(NPM) run build:css -- --outdir=$(DESTDIR)

clean:
	$(RM) -r shell.js shell.wasm index.min.js index.min.css index.min.js.map index.min.css.map $(OBJS) $(DESTDIR)
