#!/bin/sh

set -e
set -u

jflag=
jval=2

while getopts 'j:' OPTION
do
  case $OPTION in
  j)	jflag=1
        	jval="$OPTARG"
	        ;;
  ?)	printf "Usage: %s: [-j concurrency_level] (hint: your cores + 20%%)\n" $(basename $0) >&2
		exit 2
		;;
  esac
done
shift $(($OPTIND - 1))

if [ "$jflag" ]
then
  if [ "$jval" ]
  then
    printf "Option -j specified (%d)\n" $jval
  fi
fi

cd `dirname $0`/../deps
ENV_ROOT=`pwd`
. ../scripts/env.source

BIN_DIR="$ENV_ROOT/bin"
rm -rf "$BUILD_DIR" "$TARGET_DIR" "$BIN_DIR"
mkdir -p "$BUILD_DIR" "$TARGET_DIR" "$BIN_DIR"

echo "#### FFmpeg static build, by STVS SA ####"
cd $BUILD_DIR
../../scripts/fetchurl "http://www.tortall.net/projects/yasm/releases/yasm-1.3.0.tar.gz"
../../scripts/fetchurl "http://zlib.net/zlib-1.2.8.tar.gz"
../../scripts/fetchurl "http://www.bzip.org/1.0.6/bzip2-1.0.6.tar.gz"
../../scripts/fetchurl "http://downloads.sf.net/project/libpng/libpng15/older-releases/1.5.14/libpng-1.5.14.tar.gz"
../../scripts/fetchurl "http://downloads.xiph.org/releases/ogg/libogg-1.3.2.tar.gz"
../../scripts/fetchurl "http://downloads.xiph.org/releases/vorbis/libvorbis-1.3.4.tar.gz"
../../scripts/fetchurl "http://downloads.xiph.org/releases/theora/libtheora-1.1.1.tar.bz2"
../../scripts/fetchurl "http://webm.googlecode.com/files/libvpx-v1.3.0.tar.bz2"
../../scripts/fetchurl "http://downloads.sourceforge.net/project/faac/faac-src/faac-1.28/faac-1.28.tar.bz2"
../../scripts/fetchurl "ftp://ftp.videolan.org/pub/x264/snapshots/last_x264.tar.bz2"
../../scripts/fetchurl "http://downloads.xvid.org/downloads/xvidcore-1.3.3.tar.gz"
../../scripts/fetchurl "http://downloads.sourceforge.net/project/lame/lame/3.99/lame-3.99.5.tar.gz"
../../scripts/fetchurl "http://downloads.xiph.org/releases/opus/opus-1.1.tar.gz"
../../scripts/fetchurl "http://www.ffmpeg.org/releases/ffmpeg-2.4.3.tar.bz2"

echo "*** Building yasm ***"
cd $BUILD_DIR/yasm*
./configure --prefix=$TARGET_DIR
make -j $jval
make install

echo "*** Building zlib ***"
cd $BUILD_DIR/zlib*
./configure --prefix=$TARGET_DIR
make -j $jval
make install

echo "*** Building bzip2 ***"
cd $BUILD_DIR/bzip2*
make
make install PREFIX=$TARGET_DIR

echo "*** Building libpng ***"
cd $BUILD_DIR/libpng*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared
make -j $jval
make install

# Ogg before vorbis
echo "*** Building libogg ***"
cd $BUILD_DIR/libogg*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared
make -j $jval
make install

# Vorbis before theora
echo "*** Building libvorbis ***"
cd $BUILD_DIR/libvorbis*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared
make -j $jval
make install

echo "*** Building libtheora ***"
cd $BUILD_DIR/libtheora*
CC=clang ./configure --prefix=$TARGET_DIR --disable-examples --enable-static --disable-shared
make CFLAGS="-Wunused-command-line-argument-hard-error-in-future" -j $jval 
make install

echo "*** Building livpx ***"
cd $BUILD_DIR/libvpx*
./configure --prefix=$TARGET_DIR --disable-shared
make -j $jval
make install

echo "*** Building faac ***"
cd $BUILD_DIR/faac*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared

sed -i -e "s|^char \*strcasestr.*|//\0|" common/mp4v2/mpeg4ip.h
make -j $jval
make install

echo "*** Building x264 ***"
cd $BUILD_DIR/x264*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared --disable-opencl
make -j $jval
make install

echo "*** Building xvidcore ***"
cd "$BUILD_DIR/xvidcore/build/generic"
./configure --prefix=$TARGET_DIR --enable-static --disable-shared
make -j $jval
make install

echo "*** Building lame ***"
cd $BUILD_DIR/lame*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared
make -j $jval
make install

echo "*** Building opus ***"
cd $BUILD_DIR/opus*
./configure --prefix=$TARGET_DIR --enable-static --disable-shared
make -j $jval
make install

# FIXME: only OS-specific
rm -f "$TARGET_DIR/lib/*.dylib"
rm -f "$TARGET_DIR/lib/*.so"

# FFMpeg
echo "*** Building FFmpeg ***"
cd $BUILD_DIR/ffmpeg*
CFLAGS="-I$TARGET_DIR/include -I$TARGET_DIR/include/opus -Bstatic" LDFLAGS="-L$TARGET_DIR/lib -lm" ./configure --prefix=${OUTPUT_DIR:-$TARGET_DIR} --cc="clang" --extra-cflags="-I$TARGET_DIR/include -I$TARGET_DIR/include/opus -Bstatic" --extra-ldflags="-L$TARGET_DIR/lib -lm -Bstatic" --extra-version=static --enable-debug=3 --disable-shared --enable-static --extra-cflags=--static --disable-ffplay --disable-ffserver --disable-doc --enable-gpl --enable-pthreads --enable-postproc --enable-gray --enable-runtime-cpudetect --enable-libfaac --enable-libmp3lame --enable-libopus --enable-libtheora --enable-libvorbis --enable-libx264 --enable-libxvid --enable-bzlib --enable-zlib --enable-nonfree --enable-version3 --enable-libvpx --disable-asm
make -j $jval CFLAGS="-I$TARGET_DIR/include -I$TARGET_DIR/include/opus -Bstatic " && make install

# Segmenter
echo "*** Building Segmenter ***"
cp -r $ENV_ROOT/src/segmenter $BUILD_DIR
cd $BUILD_DIR/segmenter
FFMPEG_LIBS="-lavformat -lavcodec -lavutil -lavfilter -lxvidcore -lx264 -lvorbis -lvorbisfile -lvorbisenc -ltheora -ltheoraenc -ltheoradec -lswscale -lswresample -lpostproc -lopus -logg -lmp3lame -lfaac -lbz2 -lz"
OSX_LIBS="-framework CoreFoundation -framework CoreVideo -framework VideoDecodeAcceleration -lvpx -liconv"
gcc segmenter.c -o segmenter -L$TARGET_DIR/lib -I$TARGET_DIR/include $FFMPEG_LIBS $OSX_LIBS
cp segmenter $TARGET_DIR/bin

# Install binaries
cp $TARGET_DIR/bin/ffmpeg    $ENV_ROOT/bin
cp $TARGET_DIR/bin/ffprobe   $ENV_ROOT/bin
cp $TARGET_DIR/bin/segmenter $ENV_ROOT/bin
rm -rf "$BUILD_DIR" "$TARGET_DIR" 
