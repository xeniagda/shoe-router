ENDPOINT=${1:-ws://localhost:8080/ws-connect}

FREQ=$RANDOM
NAME="mjauer-$RANDOM"

(
    echo "{\"ty\":\"Hello\",\"my_name\":\"$NAME\",\"my_freq\":$FREQ,\"client_timestamp\":$(date +%s)}"
    t=2137
    while : ; do
        sleep 1
        echo "{\"ty\":\"Press\",\"client_timestamp\":$(date +%s)}"
        sleep 1
        echo "{\"ty\":\"Release\",\"client_timestamp\":$(date +%s)}"
    done
) | tee /dev/stderr | websocat -k "$ENDPOINT"
