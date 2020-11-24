set -e

cd /
./docker-entrypoint.sh nginx -g 'daemon off;' &
echo '/etc/letsencrypt/live/coral.shoes/privkey.pem' | entr nginx -s reload
