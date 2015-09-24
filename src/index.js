var Calendar = require('./calendar.js');

var calendarElement = document.getElementById('cal');
var calendar = new Calendar(calendarElement);

/**
 * Cross-browser `addEventListener`.
 * @param {HTMLElement} element Node to which to attach listener.
 * @param {String} event Event name.
 * @param {Function} callback
 */
function addEventListener(element, event, callback) {
  if (element.addEventListener) {
    element.addEventListener(event, callback);
  } else {
    // Support IE 8.
    element.attachEvent(event, callback);
  }
}

/**
 * Adds event listeners to the page.
 */
function addEventListeners() {
  var form = document.getElementById('form');
  addEventListener(form, 'submit', onFormSubmit);
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
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200 && xhr.status !== 304) {
      displayLoadErrorMessage(url);
    } else {
      displayLoadSuccessMessage(url);
      callback(xhr.responseXML);
    }
  };

  // Catch errors like "Access to restricted URI denied".
  try {
    xhr.send(null);
  } catch (e) {
    console.error(e);
    displayLoadErrorMessage(url);
  }
}

/**
 * Updates calendar's view with data from xml and writes time statistics.
 * @param {HTMLElement} xml
 */
function updateCalendar(xml) {
  // Don't use Performance.now() or Date.now() to support IE 8.
  var updateStart = new Date().getTime();

  // Update calendar's view.
  calendar.update.call(calendar, xml);

  // Show load stats.
  var updateEnd = new Date().getTime();
  displayUpdateTime(updateStart, updateEnd);
}

function displayUpdateTime(start, end) {
  var loadStats = document.getElementById('load-stats');
  loadStats.style.display = 'block';

  var timeElement = document.getElementById('update-time');
  var updateTime = end - start;
  timeElement.textContent = updateTime;
  timeElement.innerText = updateTime;
}

function displayLoadErrorMessage(xmlUrl) {
  var loadStats = document.getElementById('load-stats');
  loadStats.style.display = 'none';

  var loadInfo = document.getElementById('load-message');
  var message = 'Failed to load file "' + xmlUrl + '".';
  loadInfo.className = 'error';
  loadInfo.textContent = message;
  loadInfo.innerText = message;
}

function displayLoadSuccessMessage(xmlUrl) {
  var loadInfo = document.getElementById('load-message');
  var message = 'File "' + xmlUrl + '" sucessfully loaded.';
  loadInfo.className = 'success';
  loadInfo.textContent = message;
  loadInfo.innerText = message;
}

addEventListeners();
getXmlByUrl('data/events.xml', updateCalendar);
