var CalendarModel = require('./calendar_model');

/**
 * @param {HTMLElement} hostElement Calendar's parent element.
 * @constructor
 */
function Calendar(hostElement) {
  this.model = new CalendarModel();

  this.host = hostElement;
  this.days = hostElement.querySelectorAll('.cal-day');
}

Calendar.prototype = {
  /**
   * Parent element for calendar's view.
   * @type {?HTMLElement}
   */
  host: null,

  /**
   * Collection of day elements.
   * @type {?Object}
   */
  days: null,

  /**
   * Updates calendar: displays events for current week.
   * @param {HTMLElement} xml Events data.
   */
  update: function(xml) {
    this.model.update(xml);

    var currentWeekDay = this.model.getCurrentWeekDay();
    this.highlightDay(currentWeekDay);

    var headers = this.model.getDayHeadersForCurrentWeek();
    this.fillDayHeaders(headers);

    var events = this.model.getEventsForCurrentWeek();
    this.clearEvents();
    this.displayEvents(events);
  },

  /**
   * Highlights a day.
   * @param {Number} weekDay
   */
  highlightDay: function(weekDay) {
    var currentDay = this.host.querySelector('.is-current');
    if (currentDay) currentDay.removeAttribute('is-current');

    var today = this.days[weekDay - 1];
    today.setAttribute('is-current', true);
  },

  /**
   * Displays day headers. For example: `Tue 21 Mar`.
   * @param {Array} headers A list of headers.
   */
  fillDayHeaders: function(headers) {
    for (var i = 0, l = headers.length; i < l; i++) {
      var dayTitle = headers[i];
      var dayTitleElement = this.days[i].querySelector('.cal-day-title');
      dayTitleElement.textContent = dayTitle;
      dayTitleElement.innerText = dayTitle;
    }
  },

  /**
   * Removes all displayed events from calendar.
   */
  clearEvents: function() {
    var eventElements = this.host.querySelectorAll('.cal-event');
    if (!eventElements) return;

    for (var i = eventElements.length; i--;) {
      var element = eventElements[i];
      element.parentNode.removeChild(element);
    }
  },

  /**
   * Displays events.
   * @param {Array} events List of events to display.
   */
  displayEvents: function(events) {
    var i = 0;
    var eventsLength = events.length;
    for (; i < eventsLength; i++) {
      this.displayEvent(events[i]);
    }
  },

  /**
   * Displays one given event.
   * @param {Object} eventData
   */
  displayEvent: function(eventData) {
    var eventElement = this.createEventElement();

    var title = eventData.title;
    this.setEventTitle(eventElement, title);

    var start = eventData.startInHours;
    this.setEventTopPosition(eventElement, start);

    var duration = eventData.duration;
    this.setEventHeight(eventElement, duration);

    this.setEventWidth(eventElement, eventData);

    var weekDay = eventData.weekDay;
    var dayElement = this.days[weekDay - 1];
    dayElement.appendChild(eventElement);
  },

  /**
   * Creates html element for an event.
   * @return {HTMLElement}
   */
  createEventElement: function() {
    var eventElement = document.createElement('div');
    eventElement.className = 'cal-event';
    return eventElement;
  },

  /**
   * Displays event's title.
   * @param {HTMLElement} eventElement Element for which to display title.
   * @param {String} title Event title.
   */
  setEventTitle: function(eventElement, title) {
    eventElement.textContent = title;
    eventElement.innerText = title;
    eventElement.title = title;
  },

  /**
   * Sets event element's top/start position.
   * @param {HTMLElement} eventElement Element to position.
   * @param {Number} hours Event's start time in hours.
   */
  setEventTopPosition: function(eventElement, hours) {
    var HOURS_IN_DAY = 24;
    var top = hours * 100 / HOURS_IN_DAY;
    eventElement.style.top = top + '%';
  },

  /**
   * Sets event element's height.
   * @param {HTMLElement} eventElement Element for which to set height.
   * @param {Number} hours Event duration in hours.
   */
  setEventHeight: function(eventElement, hours) {
    var HOURS_IN_DAY = 24;
    var height = hours * 100 / HOURS_IN_DAY;
    eventElement.style.height = height + '%';
  },

  /**
   * Sets event left/right position.
   * @param {HTMLElement} eventElement Element for which to set position.
   * @param {Object} eventData
   */
  setEventWidth: function(eventElement, eventData) {
    var weekDay = eventData.weekDay;
    var bin = eventData.bin;
    var width = eventData.width;

    var numberOfBins = this.model.getNumberOfBinsByWeekDay(weekDay);
    var binWidth = 100 / numberOfBins;

    var left = bin * binWidth;
    var right = 100 - left - width * binWidth;
    eventElement.style.left = left + '%';
    eventElement.style.right = right + '%';
  }
};

module.exports = Calendar;
