var Calendar = require('./calendar.js');

var calendarElement = document.getElementById('cal');
var calendar = new Calendar(calendarElement);

/**
 * Adds event listeners to the page.
 */
function addEventListeners() {
  var form = document.getElementById('form');
  form.addEventListener('submit', onFormSubmit);
}

/**
 * Loads XML and displays events in calendar.
 * @param {Event} event Submit event.
 */
function onFormSubmit(event) {
  event.preventDefault();

  var input = document.getElementById('form-input');
  var url = input.value;
  getXmlByUrl(url, updateCalendar);
}

/**
 * Sends a request to get xml with data and call a function once data
 * is received.
 * @param {String} url Xml's url, relative or not.
 * @param {Function} callback Function to call once xml is received.
 */
function getXmlByUrl(url, callback) {
  var xhr = new XMLHttpRequest();
  if (!xhr) return;

  var method = 'GET';
  xhr.open(method, url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4 || xhr.status !== 200) return;
    callback(xhr.responseXML);
  };
  xhr.send(null);
}

function updateCalendar(xml) {
  var updateStart = Date.now();
  calendar.update.call(calendar, xml);
  var updateEnd = Date.now();
  var updateTime = updateEnd - updateStart;
  document.getElementById('update-time').textContent = updateTime;
}

addEventListeners();
getXmlByUrl('data/events.xml', updateCalendar);
