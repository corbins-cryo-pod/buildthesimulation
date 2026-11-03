#!/bin/sh
# Record the library runs (two at a time). usage: exp/lib-queue.sh [set]
cd "$(dirname "$0")/.."
run() { node exp/record.js "$@" >> runs/record.log 2>&1; }
mkdir -p runs
case "${1:-all}" in
  a) ( run conduit-8mm conduit '{"gap":8,"seed":3}' 720 240 ) & ( run conduit-graft conduit '{"gap":8,"graft":true,"seed":3}' 336 120 ) & wait ;;
  b) ( run conduit-15mm conduit '{"gap":15,"seed":3}' 720 240 ) & ( run conduit-10mm conduit '{"gap":10,"seed":3}' 720 240 ) & wait ;;
  c) ( run dish-hippocampal dish '{"count":6,"seed":11}' 168 60; run gelsurface-2 gelSurface '{"stiffness":2,"seed":5}' 48 30 ) & ( run gel-0.5 gel '{"stiffness":0.5,"seed":5}' 48 30; run gel-2 gel '{"stiffness":2,"seed":5}' 48 30 ) & wait ;;
esac
echo "SET ${1:-all} DONE" >> runs/record.log
