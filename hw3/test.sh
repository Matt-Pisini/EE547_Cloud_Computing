#!/bin/bash

CURL_OPTS="-w '\n%{http_code}\n'"
HOST=localhost
PORT=3000

function url() {
    local PATH=$1
    echo "http://$HOST:$PORT$PATH"
}

# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=5")
# curl $CURL_OPTS -X POST $(url "/player?fname=will&lname=g&handed=left&initial_balance_usd=110")
# curl $CURL_OPTS -X POST $(url "/player?fname=matt&lname=Pisini&handed=right&initial_balance_usd=3")
# curl $CURL_OPTS -X DELETE $(url "/player/615fa78057b98aedc89a422d")
# curl $CURL_OPTS -X GET $(url "/player/615fbc1b1188dfc89717ad97")
# curl $CURL_OPTS -X GET $(url "/player/615fbc1188dfc89717ad97")


# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=1.00")
# curl $CURL_OPTS -X POST $(url "/deposit/player/615ff3584c41ef8916512fc2?amount_usd=10a")
# curl $CURL_OPTS -X GET $(url "/player/615fd8a3ba1cd3ef212f0773")
# curl $CURL_OPTS -X POST $(url "/player/616667005ea00d31bcab314f?active=false")
# curl $CURL_OPTS -X GET $(url "/player")

# MATCHES

# curl $CURL_OPTS -X POST $(url "/player?fname=matt&lname=Pisini&handed=right&initial_balance_usd=3")
# curl $CURL_OPTS -X POST $(url "/player?fname=shira&lname=s&handed=right&initial_balance_usd=5")

# curl $CURL_OPTS -X POST $(url "/match?pid1=616cf0b8b8038fb798449b89&pid2=616cf0b8b8038fb798449b8a&entry_fee_usd=1&prize_usd=10.00")
# curl $CURL_OPTS -X POST $(url "/match/616cf0d6b8038fb798449b8b/award/616cf0b8b8038fb798449b89?points=1")
curl $CURL_OPTS -X POST $(url "/match/616cf0d6b8038fb798449b8b/disqualify/616cf0b8b8038fb798449b89")
# curl $CURL_OPTS -X POST $(url "/match/616cea0a19976270417197dc/end/")
