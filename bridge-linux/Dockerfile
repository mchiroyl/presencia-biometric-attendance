FROM debian:bookworm-slim AS native
RUN sed -i 's/Types: deb$/Types: deb deb-src/' /etc/apt/sources.list.d/debian.sources && printf 'Acquire::http::Timeout "20";\nAcquire::Retries "1";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99-network-timeout && apt-get update && apt-get install -y --no-install-recommends dpkg-dev build-essential meson ninja-build libglib2.0-dev libgusb-dev libpixman-1-dev libnss3-dev python3 pkg-config && cd /tmp && apt-get source libfprint=1:1.94.5-1
COPY bridge-linux/match-extension.c /tmp/match-extension.c
RUN cat /tmp/match-extension.c >> /tmp/libfprint-1.94.5/libfprint/fpi-print.c && meson setup /tmp/libfprint-build /tmp/libfprint-1.94.5 --prefix=/usr/local -Ddrivers=uru4000 -Ddoc=false -Dintrospection=false -Dudev_rules=disabled -Dudev_hwdb=disabled && ninja -C /tmp/libfprint-build && DESTDIR=/opt/native ninja -C /tmp/libfprint-build install

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-gi python3-websockets gir1.2-fprint-2.0 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=native /opt/native/usr/local/lib/ /usr/local/lib/
# Fuentes completas, parche aplicado y licencia disponibles dentro de la imagen.
COPY --from=native /tmp/libfprint-1.94.5 /usr/share/school-libfprint/source
COPY bridge-linux/match-extension.c /usr/share/school-libfprint/match-extension.c
RUN ldconfig
ENV LD_LIBRARY_PATH=/usr/local/lib/x86_64-linux-gnu
WORKDIR /app
COPY bridge-linux/*.py ./
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Sin SDK HID. Acceso USB limitado por el montaje y device_cgroup_rules de Compose.
USER 10001:10001
CMD ["python3", "server.py"]
