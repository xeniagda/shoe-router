FROM rust:latest as configurafox
RUN cd /var ; cargo new site
WORKDIR /var/site
COPY coral-shoes/Cargo.toml /var/site/Cargo.toml
RUN cargo build --release
RUN rm -rf src
COPY coral-shoes/src /var/site/src
RUN cargo build --release
COPY coral-shoes/site /var/site/site
RUN touch src/main.rs
RUN RUST_LOG=info ./target/release/site /var/site/out

FROM nginx:latest

RUN apt-get update

COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=configurafox /var/site/out /var/www/static/coral.shoes

ENTRYPOINT [ "sh", "/entry.sh" ]
