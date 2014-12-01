#!/bin/sh

# Paths
SCRIPTS=$(cd -P -- "$(dirname -- "$0")" && printf '%s\n' "$(pwd -P)")
BASEDIR=$(dirname "$SCRIPTS") 
PREFIX="$BASEDIR/deps"
BINDIR="$PREFIX/bin"
LIBDIR="$PREFIX/lib"
INCLUDES="$PREFIX/include"
SOURCE="$PREFIX/src"
FFMPEG="$PREFIX/src/ffmpeg"
SEGMENTER="$PREFIX/src/segmenter"

# Get Repository
#cd "$SOURCE" && git clone https://github.com/FFmpeg/FFmpeg.git ffmpeg

# Build ffmpeg
#OPTS="--prefix=$PREFIX --enable-static --disable-shared --enable-pthreads --enable-gpl --enable-version3 --enable-nonfree --enable-hardcoded-tables --enable-avresample --enable-vda --cc=clang --host-cflags= --host-ldflags= --extra-cflags=-I$INCLUDES --extra-ldflags=-L$LIBDIR --enable-libx264 --enable-libfaac --enable-libmp3lame --enable-libxvid"
#CMD="./configure $OPTS"
#cd "$FFMPEG" && $CMD 
#&& make && make install

# Build the Segmenter
OPTS="-lavformat -lavcodec -lavutil"
CMD="gcc segmenter.c -o segmenter -L$LIBDIR -I$INCLUDES $OPTS"
cd "$SEGMENTER" && $CMD && mv segmenter "$BINDIR"
