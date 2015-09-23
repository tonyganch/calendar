#!/bin/bash

cp src/index.html index.html
cp src/index.css index.css

./node_modules/.bin/browserify src/index.js > index.js
