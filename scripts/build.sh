#!/bin/bash

rm -rf build
mkdir build

cp src/index.html build/index.html
cp src/index.css build/index.css

./node_modules/.bin/browserify src/index.js > build/index.js
