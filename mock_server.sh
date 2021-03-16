#!/bin/sh

usage() { echo "Usage: $0 [-p <HTTP_PORT>] [-n <name>]" 1>&2; exit 1; }

while getopts ":p:n:" o ; do
    case "${o}" in
        p)
            PORT=${OPTARG}
            if [ -n "${PORT}" ] && [ "${PORT}" -eq "${PORT}" ] 2>/dev/null ; then
                true
            else
                echo "Invalid port '${PORT}'"
                usage
            fi
            ;;
        n)
            NAME=${OPTARG}
            ;;
        *)
            usage
            ;;
    esac
done

if [ -z "${PORT}" ] ; then
    echo 'Missing port!'
    usage
fi
if [ -z "${NAME}" ] ; then
    echo 'Missing name!'
    usage
fi

echo "PORT=${PORT}"
echo "NAME=${NAME}"


docker run \
    --network shoe-router_default \
    -p "${PORT}" \
    -e HTTP_PORT="${PORT}" \
    -h "${NAME}" \
    --name "shoe-router_${NAME}" \
    --rm \
    -t \
    mendhak/http-https-echo:18
