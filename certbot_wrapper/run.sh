cpath='/etc/letsencrypt/live/coral.shoes'

# generate fake cert
mkdir -p /etc/letsencrypt/live/coral.shoes/
openssl req -x509 -nodes -newkey rsa:4096 -days 1\
    -keyout "$cpath/privkey.pem"\
    -out "$cpath/fullchain.pem"\
    -subj '/CN=localhost'

# wait for nginx to load the cert
sleep 2

# generate real cert
certbot certonly --webroot -w /var/www/certbot \
    --email 'jonathan.loov@gmail.com' \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    -d 'coral.shoes'

if [ test -f /etc/letsencrypt/live/coral.shoes-0001/]
    rm -rf $cpath
    mv /etc/letsencrypt/live/coral.shoes-0001/ $cpath
fi

while : ; do
    sleep 6h
    certbot renew
done
