#!/bin/sh
# wait-for-it.sh: Wait for a service to be available
# Usage: ./wait-for-it.sh host:port [-t timeout] [-- command args]
# Original from: https://github.com/vishnubob/wait-for-it
# Modified for Alpine Linux

WAITFORIT_cmdname=${0##*/}

echoerr() { if [ "$WAITFORIT_QUIET" -ne 1 ]; then echo "$@" 1>&2; fi }

usage()
{
    cat << USAGE >&2
Usage:
    $WAITFORIT_cmdname host:port [-t timeout] [-- command args]
    -q | --quiet                        Do not output any status messages
    -t TIMEOUT | --timeout=TIMEOUT      Timeout in seconds, zero for no timeout
    -- COMMAND ARGS                     Execute command with args after the test finishes
USAGE
    exit 1
}

wait_for()
{
    if [ "$WAITFORIT_TIMEOUT" -gt 0 ]; then
        echoerr "$WAITFORIT_cmdname: waiting $WAITFORIT_TIMEOUT seconds for $WAITFORIT_HOST:$WAITFORIT_PORT"
    else
        echoerr "$WAITFORIT_cmdname: waiting for $WAITFORIT_HOST:$WAITFORIT_PORT without a timeout"
    fi
    
    WAITFORIT_start_ts=$(date +%s)
    while :
    do
        nc -z "$WAITFORIT_HOST" "$WAITFORIT_PORT" > /dev/null 2>&1
        WAITFORIT_result=$?
        
        if [ $WAITFORIT_result -eq 0 ]; then
            WAITFORIT_end_ts=$(date +%s)
            echoerr "$WAITFORIT_cmdname: $WAITFORIT_HOST:$WAITFORIT_PORT is available after $((WAITFORIT_end_ts - WAITFORIT_start_ts)) seconds"
            break
        fi
        
        if [ "$WAITFORIT_TIMEOUT" -gt 0 ] && [ $(($(date +%s) - WAITFORIT_start_ts)) -ge "$WAITFORIT_TIMEOUT" ]; then
            echoerr "$WAITFORIT_cmdname: timeout occurred after waiting $WAITFORIT_TIMEOUT seconds for $WAITFORIT_HOST:$WAITFORIT_PORT"
            return 1
        fi
        
        sleep 1
    done
    return 0
}

parse_arguments()
{
    WAITFORIT_HOST=""
    WAITFORIT_PORT=""
    WAITFORIT_TIMEOUT=15
    WAITFORIT_QUIET=0
    WAITFORIT_HOST_PORT=""
    
    while [ $# -gt 0 ]
    do
        case "$1" in
            *:* )
            WAITFORIT_HOST_PORT=$1
            WAITFORIT_HOST=${1%:*}
            WAITFORIT_PORT=${1#*:}
            shift 1
            ;;
            -q | --quiet)
            WAITFORIT_QUIET=1
            shift 1
            ;;
            -t)
            WAITFORIT_TIMEOUT="$2"
            if [ "$WAITFORIT_TIMEOUT" = "" ]; then break; fi
            shift 2
            ;;
            --timeout=*)
            WAITFORIT_TIMEOUT="${1#*=}"
            shift 1
            ;;
            --)
            shift
            WAITFORIT_CLI=("$@")
            break
            ;;
            *)
            echoerr "Unknown argument: $1"
            usage
            ;;
        esac
    done
    
    if [ "$WAITFORIT_HOST" = "" ] || [ "$WAITFORIT_PORT" = "" ]; then
        echoerr "Error: you need to provide a host and port to test."
        usage
    fi
}

wait_for_wrapper()
{
    wait_for
    WAITFORIT_RESULT=$?
    if [ $WAITFORIT_RESULT -ne 0 ]; then
        exit $WAITFORIT_RESULT
    fi
    
    if [ "${WAITFORIT_CLI[*]}" != "" ]; then
        exec "${WAITFORIT_CLI[@]}"
    fi
}

# Process arguments
parse_arguments "$@"
wait_for_wrapper 