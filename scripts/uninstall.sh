#!/bin/sh
SCRIPTS=$(cd -P -- "$(dirname -- "$0")" && printf '%s\n' "$(pwd -P)")
BASEDIR=$(dirname "$SCRIPTS") 
BINDIR="$BASEDIR/deps/bin"
cd $BASEDIR && rm -rf node_modules
cd $BINDIR && rm -f ffmpeg ffprobe segmenter
