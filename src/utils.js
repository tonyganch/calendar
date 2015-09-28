var utils = {
  /**
   * Converts unix timestamp to Date object.
   * @param {Number} unixTimestamp
   * @return {Date}
   */
  convertUnixTimestampToDate: function(unixTimestamp) {
    return new Date(unixTimestamp * 1000);
  },

  /**
   * Cross-browser implementation of `Array.prototype.filter`.
   * @param {Array} list List to filter.
   * @param {Function} callback Function to test each element of the array.
   * @return {Array}
   */
  filter: function(list, callback) {
    if (Array.prototype.filter) {
      return list.filter(callback);
    } else {
      var t = Object(list);
      var len = t.length >>> 0;

      var res = [];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          var val = t[i];
          if (callback(val, i, t)) {
            res.push(val);
          }
        }
      }

      return res;
    }
  },

  /**
   * Gets element's text content in Date type.
   * @param {HTMLElement} element
   * @return {Date}
   */
  getDateFromElement: function(element) {
    var text = this.getTextFromElement(element);
    var timestamp = parseInt(text, 10);
    return this.convertUnixTimestampToDate(timestamp);
  },

  /**
   * Gets element's text content.
   * @param {HTMLElement} element
   * @return {String}
   */
  getTextFromElement: function(element) {
    if (element.textContent) {
      return element.textContent;
    } else {
      // Support IE 8.
      return element.childNodes[0].nodeValue;
    }
  },

  /**
   * Cross-browser implementation of `Array.prototype.map`.
   * @param {Array} list List of elements to map.
   * @param {Function} callback Function to call for each element in collection.
   * @return {Array}
   */
  map: function(list, callback) {
    if (Array.prototype.map) {
      return list.map(callback);
    } else {
      // Polyfill is taken from MDN.
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
      // Global_Objects/Array/map
      var O = Object(list);
      var len = O.length >>> 0;
      var A = new Array(len);
      var k = 0;

      while (k < len) {
        if (k in O) {
          var kValue = O[k];
          var mappedValue = callback(kValue, k, O);
          A[k] = mappedValue;
        }
        k++;
      }

      return A;
    }
  }
};

module.exports = utils;
