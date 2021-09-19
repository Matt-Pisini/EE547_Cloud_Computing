#!/bin/bash

CURL_OPTS="-w '\n%{http_code}\n'"
HOST=localhost
PORT=3000

function url() {
    local PATH=$1
    echo "http://$HOST:$PORT$PATH"
}

curl $CURL_OPTS -X GET $(url "/player/1")
curl $CURL_OPTS -X DELETE $(url "/player/1")
curl $CURL_OPTS -X GET $(url "/player/1")