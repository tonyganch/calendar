var express = require('express');

var app = express();

app.get('/', express.static('build/index.html'));
app.use(express.static('build'));
app.use('/data', express.static('data'));

app.listen(3000);
