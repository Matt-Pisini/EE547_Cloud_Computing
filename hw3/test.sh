#!/bin/bash

CURL_OPTS="-w '\n%{http_code}\n'"
HOST=localhost
PORT=3000

function url() {
    local PATH=$1
    echo "http://$HOST:$PORT$PATH"
}

# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=0.9")
# curl $CURL_OPTS -X POST $(url "/player?fname=will&lname=g&handed=left&initial_balance_usd=110")
# curl $CURL_OPTS -X POST $(url "/player?fname=matt&lname=Pisini&handed=right&initial_balance_usd=0")
# curl $CURL_OPTS -X POST $(url "/player/615f94683997136a3a7cb0d9?active=t")
# curl $CURL_OPTS -X DELETE $(url "/player/615fa78057b98aedc89a422d")
# curl $CURL_OPTS -X GET $(url "/player/615fbc1b1188dfc89717ad97")
# curl $CURL_OPTS -X GET $(url "/player/615fbc1188dfc89717ad97")


# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=0.9")
# curl $CURL_OPTS -X POST $(url "/deposit/player/615fc509104e9fb39cb4cf19?amount_usd=100a")
# curl $CURL_OPTS -X GET $(url "/player")

