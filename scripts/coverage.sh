#!/bin/bash

./node_modules/.bin/mocha --require intelli-espower-loader --require blanket --reporter html-cov test/calendar_model.js
