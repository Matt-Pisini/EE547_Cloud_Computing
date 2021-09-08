#!/bin/bash

OUTPUT=/tmp/hw1p2.log
REPORT_FILE=report.json

# install dependencies
HOME=/home/autograde npm install
HOME=/home/autograde pip3 install -r requirements.txt

start=`date +%s`

HOME=/home/autograde REPORT_FILE=$REPORT_FILE npm test > "$OUTPUT" 2>&1 | true

status=$?
end=`date +%s`

echo "Runtime: $((end-start))"
[ -f $OUTPUT ] && cat $OUTPUT

# check status
if [ ${status} -ne 0 ]; then
    echo "Failure: fails or returns nonzero exit status of ${status}"
    echo '{"scores": {"Success": 0}}'
    exit
fi

# include any post-parsing here

NFAIL=$(jq -r '.stats.failures' < $REPORT_FILE)
NPASS=$(jq -r '.stats.passes' < $REPORT_FILE)
NTOTAL=$(jq -r '.stats.tests' < $REPORT_FILE)

cat $REPORT_FILE
echo ""
echo '{"scores": {"Success":1, "Pass":'${NPASS:=0}', "Fail":'${NFAIL:=0}', "Score":'$((100 * $NPASS/${NTOTAL:=1}))'}}'

exit
