var DOMParser = require('xmldom').DOMParser;
var fs = require('fs');

var utils = {
  getXmlFromFile: function(path) {
    var fileContent = fs.readFileSync(path, 'utf8');
    var parser = new DOMParser();
    return parser.parseFromString(fileContent, 'text/xml');
  }
};

module.exports = utils;
