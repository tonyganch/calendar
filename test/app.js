var express = require('express');

var app = express();

app.get('/', express.static('build/index.html'));
app.use(express.static('build'));

app.listen(3000);
