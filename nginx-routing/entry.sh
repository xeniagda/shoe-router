sleep 1 # wait for everything to start

cd /
./docker-entrypoint.sh nginx -g 'daemon off;' &

while : ; do
    sleep 1h
    echo 'nginx reload'
    nginx -s reload
done
