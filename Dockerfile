FROM debian:trixie AS builder
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnu-which sed build-essential binutils diffutils ca-certificates \
    bash patch gzip bzip2 perl tar cpio unzip rsync file \
    bc findutils gawk wget libncurses-dev python3 curl git

COPY --parents shell/./board shell/./configs shell/./Config.in shell/./external.desc shell/./external.mk shell/./Makefile /app/

WORKDIR /app

RUN make bootstrap

ARG BR2_DL_DIR=/var/cache/buildroot/dl
ARG BR2_CCACHE_DIR=/var/cache/buildroot/ccache
ARG BR2_HOST_DIR=/var/cache/buildroot/host

RUN make buildroot-defconfig

RUN \
    --mount=type=cache,target=${BR2_DL_DIR} \
    --mount=type=cache,target=${BR2_CCACHE_DIR} \
    --mount=type=cache,target=${BR2_HOST_DIR} \
    make all && cp build/v86/images/bzImage . && rm -rf build buildroot
