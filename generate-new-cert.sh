#!/bin/bash
#
# Stolen from https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71
# Thanks!

set -e

if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Error: docker-compose is not installed.' >&2
  exit 1
fi

domains="coral.shoes aaaa.coral.shoes kijetesantaka.lu"
rsa_key_size=4096
data_path="./ssl"
email="jonathan.loov@gmail.com" # Adding a valid address is strongly recommended
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

if [ -d "$data_path" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi


if [ ! -e "$data_path/certs/options-ssl-nginx.conf" ] || [ ! -e "$data_path/certs/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/certs"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/certs/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/certs/ssl-dhparams.pem"
  echo
fi

for domain in $domains ; do
    echo "### Creating dummy certificate for $domain ..."
    cert_path="/etc/letsencrypt/live/$domain"
    mkdir -p "$data_path/certs/live/$domain"
    docker-compose run --rm --entrypoint "\
      openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
        -keyout '$cert_path/privkey.pem' \
        -out '$cert_path/fullchain.pem' \
        -subj '/CN=localhost'" certbot
    echo
done

if [ "$1" = '--dummy-only' ] ; then
    echo 'Done!'
    exit
fi

echo "### Starting nginx ..."
docker-compose up --force-recreate -d router
echo


for domain in $domains ; do
    echo "### Deleting dummy certificate for $domain ..."
    docker-compose run --rm --entrypoint "\
      rm -Rf /etc/letsencrypt/live/$domain && \
      rm -Rf /etc/letsencrypt/archive/$domain && \
      rm -Rf /etc/letsencrypt/renewal/$domain.conf" certbot
    echo
done


# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

for domain in $domains ; do
    echo "### Requesting Let's Encrypt certificate for $domain ..."

    docker-compose run --rm --entrypoint "\
      certbot certonly --webroot -w /var/www/certbot \
        $staging_arg \
        $email_arg \
        -d $domain \
        --rsa-key-size $rsa_key_size \
        --agree-tos \
        --force-renewal" certbot
    echo
done

echo "### Stopping nginx ..."
docker-compose down
