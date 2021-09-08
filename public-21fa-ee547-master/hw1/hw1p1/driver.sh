#!/bin/bash

OUTPUT=/tmp/hw1p1.log
REPORT=report.json

PYTEST_OPTS=""
PYTEST_OPTS="$PYTEST_OPTS --cache-clear -rA --capture=no --show-capture=no --tb=short"
PYTEST_OPTS="$PYTEST_OPTS --json-report --json-report-file=$REPORT --json-report-omit collectors keywords"
PYTEST_OPTS="$PYTEST_OPTS --suppress-tests-failed-exit-code"

start=`date +%s`
pytest $PYTEST_OPTS . > "$OUTPUT" 2>&1
#python3 -u hw1p1-soln.py 
status=$?
end=`date +%s`

echo "Runtime: $((end-start))"
cat $OUTPUT

# checkout output status
if [ ${status} -ne 0 ]; then
    echo "Failure: fails or returns nonzero exit status of ${status}"
    echo '{"scores": {"Success": 0}}'
    exit
fi

# include any post-parsing here

NFAIL=$(jq -r '.summary.failed | select(.!=null)' < report.json)
NPASS=$(jq -r '.summary.passed | select(.!=null)' < report.json)
NTOTAL=$(jq -r '.summary.total | select(.!=null)' < report.json)

echo '{"scores": {"Success":1, "Pass":'${NPASS:=0}', "Fail":'${NFAIL:=0}', "Score":'$((100 * $NPASS/${NTOTAL:=1}))'}}'

exit
