SRC_DIR := src
DST_DIR := build

C2W_DIR := $(SRC_DIR)/container2wasm
C2W_RUNCONTAINER_DIR := $(C2W_DIR)/extras/runcontainerjs/src/web

SRC_JS := \
	$(SRC_DIR)/index.js \
	$(SRC_DIR)/sw.js \
	$(SRC_DIR)/index.css \
	$(C2W_RUNCONTAINER_DIR)/stack-worker.js \
	$(C2W_RUNCONTAINER_DIR)/worker-util.js

SRC_DOCKER := \
	$(SRC_DIR)/Dockerfile \
	$(SRC_DIR)/overlay/etc/profile \
	$(SRC_DIR)/overlay/etc/motd


all: $(DST_DIR)/index.html \
	$(DST_DIR)/oci-image/index.json \
	$(DST_DIR)/imagemounter.wasm.gzip \
	$(DST_DIR)/vm/.vm \
	$(DST_DIR)/.js

$(DST_DIR)/index.html: $(SRC_DIR)/index.html | $(DST_DIR)
	cp $< $@

$(DST_DIR)/.js: $(SRC_JS) | $(DST_DIR)
	npm ci && npm run build
	touch $@

# c2w VM
$(DST_DIR)/vm/.vm: | $(DST_DIR)/vm
	c2w --to-js --external-bundle $(DST_DIR)/vm/
	touch $@

# imagemounter
$(DST_DIR)/imagemounter.wasm.gzip: $(C2W_DIR)/out/imagemounter.wasm | $(DST_DIR)
	cat $< | gzip > $@

$(C2W_DIR)/out/imagemounter.wasm:
	$(MAKE) -C $(C2W_DIR) imagemounter.wasm

# docker image
$(DST_DIR)/oci-image/index.json: $(SRC_DOCKER) | $(DST_DIR)/oci-image
	@-docker buildx create --name container --driver=docker-container
	docker buildx build --builder=container --output type=oci,oci-mediatype=true,compression=estargz,force-compression=true,dest=- $(SRC_DIR) | tar -C $(DST_DIR)/oci-image -xf -
	touch $@

$(DST_DIR)/%:
	mkdir -p $@

$(DST_DIR):
	mkdir -p $@

clean:
	rm -rf $(DST_DIR)

.PHONY: all clean
