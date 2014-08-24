#!/usr/bin/env bash
gcc segmenter.c -o segmenter -L/opt/boxen/homebrew/lib -I/opt/boxen/homebrew/include -lavformat -lavcodec -lavutil
