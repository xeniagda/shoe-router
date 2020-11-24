mkdir -p /etc/letsencrypt/live/coral.shoes/
openssl req -x509 -nodes -newkey rsa:4096 -days 1\
    -keyout '/etc/letsencrypt/live/coral.shoes/privkey.pem'\
    -out '/etc/letsencrypt/live/coral.shoes/fullchain.pem'\
    -subj '/CN=localhost'
