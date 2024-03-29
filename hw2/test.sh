#!/bin/bash

CURL_OPTS="-w '\n%{http_code}\n'"
HOST=localhost
PORT=3000

function url() {
    local PATH=$1
    echo "http://$HOST:$PORT$PATH"
}

# curl $CURL_OPTS -X POST $(url "/player?fname=&lname=")
# curl $CURL_OPTS -X POST $(url "/player?fname=9matt&lname=pisini&handed=right&initial_balance_usd=100")
curl $CURL_OPTS -X POST $(url "/player?fname=1matt&lname=0pisini&handed=right&initial_balance_usd=100")
# curl $CURL_OPTS -X POST $(url "/player?fname=matt&lname=Pisini&handed=right&initial_balance_usd=10.13")
# curl $CURL_OPTS -X POST $(url "/player?fname=matt&lname=Pisini&handed=right&initial_balance_usd=0")

# curl $CURL_OPTS -X POST $(url "/player/1?active=0")
# curl $CURL_OPTS -X POST $(url "/player/1?active=1&lname=76yh")

# curl $CURL_OPTS -X POST $(url "/deposit/player/2?amount_usd=10000")
# curl $CURL_OPTS -X POST $(url "/deposit/player/4?amount_usd=789")

# curl $CURL_OPTS -X GET $(url "/ping")
# curl $CURL_OPTS -X GET $(url "/player")
# curl $CURL_OPTS -X GET $(url "/player/1")
# curl $CURL_OPTS -X GET $(url "/player/2")
# curl $CURL_OPTS -X DELETE $(url "/player/1")
# curl $CURL_OPTS -X GET $(url "/player")
# curl $CURL_OPTS -X GET $(url "/player/1")
# curl $CURL_OPTS -X DELETE $(url "/player/2")
# curl $CURL_OPTS -X GET $(url "/player")
# curl $CURL_OPTS -X GET $(url "/player")