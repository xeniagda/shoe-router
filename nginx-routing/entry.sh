set -e

cd /
./docker-entrypoint.sh nginx -g 'daemon off;' &

sleep 20 # wait for cert to generate

while : ; do
    echo 'nginx reload'
    nginx -s reload
    sleep 1h
done
