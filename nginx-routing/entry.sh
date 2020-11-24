set -e

sleep 10 # wait for fake cert to generate

cd /
./docker-entrypoint.sh nginx -g 'daemon off;' &

sleep 20 # wait for cert to generate

while : ; do
    echo 'nginx reload'
    nginx -s reload
    sleep 1h
done
