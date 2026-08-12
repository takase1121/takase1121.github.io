FROM alpine:3.24

RUN apk --no-cache add nano vim tcc python3 htop curl lynx musl-dev tcc-libs tcc-libs-static fastfetch

COPY overlay/ /

ENV ENV="/etc/profile"
