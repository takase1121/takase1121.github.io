SRC_DIR := src
DST_DIR := build

C2W_DIR := $(SRC_DIR)/container2wasm
C2W_RUNCONTAINER_DIR := $(C2W_DIR)/extras/runcontainerjs/src/web

SRC_JS := \
	build.js \
	$(SRC_DIR)/index.js \
	$(SRC_DIR)/sw.js \
	$(SRC_DIR)/index.css \
	$(C2W_RUNCONTAINER_DIR)/stack-worker.js \
	$(C2W_RUNCONTAINER_DIR)/worker-util.js

SRC_DOCKER := \
	$(SRC_DIR)/Dockerfile \
	$(SRC_DIR)/overlay/etc/profile \
	$(SRC_DIR)/overlay/etc/motd

all: $(DST_DIR)/shell/index.html \
	$(DST_DIR)/shell/oci-image/index.json \
	$(DST_DIR)/shell/imagemounter.wasm.gzip \
	$(DST_DIR)/.vm \
	$(DST_DIR)/.js

$(DST_DIR)/shell/index.html: $(SRC_DIR)/index.html | $(DST_DIR)/shell
	cp $< $@

$(DST_DIR)/.js: $(SRC_JS) | $(DST_DIR)/shell
	npm ci && npm run build $(DST_DIR)
	touch $@

# c2w VM
$(DST_DIR)/.vm: $(C2W_DIR)/out/c2w | $(DST_DIR)/shell/vm
	$< --to-js --external-bundle $(C2W_BUILDX_ARGS) $(DST_DIR)/shell/vm/
	touch $@

# imagemounter
$(DST_DIR)/shell/imagemounter.wasm.gzip: $(C2W_DIR)/out/imagemounter.wasm | $(DST_DIR)
	cat $< | gzip > $@

# docker image
$(DST_DIR)/shell/oci-image/index.json: $(SRC_DOCKER) | $(DST_DIR)/shell/oci-image
	@-docker buildx create --name container --driver=docker-container
	docker buildx build --builder=container \
		$(IMG_BUILDX_ARGS) \
		--output type=oci,oci-mediatype=true,compression=estargz,force-compression=true,dest=- $(SRC_DIR) \
		| tar -C $(DST_DIR)/shell/oci-image -xf -
	@for f in $(DST_DIR)/shell/oci-image/blobs/sha256/*; do \
		if [ -f "$$f" ]; then \
			mv -v "$$f" "$$f.gz"; \
		fi \
	done
	touch $@

$(C2W_DIR)/out/%:
	$(MAKE) -C $(C2W_DIR) $(notdir $@)

$(DST_DIR)/%:
	mkdir -p $@

$(DST_DIR):
	mkdir -p $@

clean:
	rm -rf $(DST_DIR)

.PHONY: all clean
