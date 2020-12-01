cd /
./docker-entrypoint.sh nginx -g 'daemon off;' &

while : ; do
    sleep 1h
    echo 'nginx reload'
    nginx -s reload
done
