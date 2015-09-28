#!/bin/bash

./node_modules/.bin/uglifyjs --compress --mangle -o build/index.js build/index.js
