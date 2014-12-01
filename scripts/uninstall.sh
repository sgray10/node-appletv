#!/bin/sh
SCRIPTS=$(cd -P -- "$(dirname -- "$0")" && printf '%s\n' "$(pwd -P)")
BASEDIR=$(dirname "$SCRIPTS") 
PREFIX="$BASEDIR/deps"
BINDIR="$PREFIX/bin"
SOURCE="$PREFIX/src"
FFMPEG="$PREFIX/src/ffmpeg"
cd $FFMPEG && make uninstall && make clean && rm -rf $BINDIR/segmenter
cd $SOURCE && rm -rf ffmpeg
cd $BASEDIR && rm -rf node_modules
