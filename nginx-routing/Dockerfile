FROM nginx:latest

RUN apt-get update
RUN apt-get install -y entr

COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

ENTRYPOINT [ "sh", "/entry.sh" ]
