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
# curl $CURL_OPTS -X DELETE $(url "/player/615fa78057b98aedc89a422d")
# curl $CURL_OPTS -X GET $(url "/player/615fbc1b1188dfc89717ad97")
# curl $CURL_OPTS -X GET $(url "/player/615fbc1188dfc89717ad97")


# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=1.00")
# curl $CURL_OPTS -X POST $(url "/deposit/player/615ff3584c41ef8916512fc2?amount_usd=10a")
# curl $CURL_OPTS -X GET $(url "/player/615fd8a3ba1cd3ef212f0773")
# curl $CURL_OPTS -X POST $(url "/player/61600746b1b041b9f674803d?active=false")
# curl $CURL_OPTS -X GET $(url "/player")

# MATCHES

# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=10.00")
# curl $CURL_OPTS -X POST $(url "/player?fname=matt&lname=Pisini&handed=right&initial_balance_usd=10")
curl $CURL_OPTS -X POST $(url "/match?pid1=6160195d5d8798ac194f8b93&pid2=6160195d5d8798ac194f8b92&entry_fee_usd=1&prize_usd=100.00")
curl $CURL_OPTS -X GET $(url "/match")
