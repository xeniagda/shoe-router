set -e

cd /
./docker-entrypoint.sh nginx -g 'daemon off;' &

sleep 2 # wait for cert to generate

echo '/etc/letsencrypt/live/coral.shoes/privkey.pem' | entr nginx -s reload
