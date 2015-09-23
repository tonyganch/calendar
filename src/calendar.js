var utils = require('./utils');

/**
 * @param {HTMLElement} hostElement Calendar's parent element.
 * @constructor
 */
function Calendar(hostElement) {
  this.host = hostElement;
  this.mainView = hostElement.querySelector('.cal-days');
  this.days = hostElement.querySelectorAll('.cal-day');

  this.hourHeight = this.mainView.offsetHeight / 24;
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
   * Index of the last day for which events were displayed.
   * @type {?Array}
   */
  lastUpdatedDay: null,

  /**
   * List of displayed events. Contains information about start/end time of the
   * events, its column index and width in columns. Grouped by date.
   * @type {?Array}
   */
  events: null,

  /**
   * Bins/columns of events for displaying several events on the same spot.
   * Contains information about column's bottom line (last event's end time).
   * Grouped by date.
   * @type {?Array}
   */
  bins: null,

  /**
   * List of gaps inside bins (empty space not occupied by any event).
   * Contains gap's start/end time. Grouped by date and column.
   * @type {?Array}
   */
  gaps: null,

  /**
   * Updates calendar: displays events for current week.
   * @param {HTMLElement} xml Events data.
   */
  update: function(xml) {
    var today = utils.getCurrentDayFromXml(xml);
    var weekStart = utils.getWeekStartByDate(today);
    var events = utils.getEventsByWeekFromXml(xml, weekStart);

    this.highlightDay(today);
    this.fillDayHeaders(weekStart);
    this.clearEvents();
    this.displayEvents(events);
  },

  /**
   * Highlight a day.
   * @param {Date} date
   */
  highlightDay: function(date) {
    var currentDay = this.host.querySelector('.is-current');
    if (currentDay) currentDay.classList.remove('is-current');

    var today = this.getDayElementByDate(date);
    today.classList.add('is-current');
  },

  /**
   * Localize and display day headers. For example: `Tue 21 Mar`.
   * @param {Date} weekStart Start time of the displayed week.
   */
  fillDayHeaders: function(weekStart) {
    var DAYS_IN_WEEK = 7;
    var currentDay = new Date(weekStart);

    for (var i = 0; i < DAYS_IN_WEEK; i++) {
      var dayTitle = this.formatDateForDayHeader(currentDay);
      this.days[i].querySelector('.cal-day-title').textContent = dayTitle;
      currentDay.setDate(currentDay.getDate() + 1);
    }
  },

  /**
   * Localizes date to display in day header.
   * @param {Date} date
   * @return {String}
   */
  formatDateForDayHeader: function(date) {
    var formatOptions = {weekday: 'short', day: 'numeric', month: 'short'};
    return date.toLocaleString([], formatOptions);
  },

  /**
   * Gets day's element by given date.
   * @param {Date} date
   * @return {HTMLElement}
   */
  getDayElementByDate: function(date) {
    var weekDay = date.getDay();
    // Switch Sunday from week[0] to week[7].
    if (weekDay === 0) weekDay = 7;
    return this.days[weekDay - 1];
  },

  /**
   * Removes all displayed events from calendar.
   */
  clearEvents: function() {
    this.lastUpdatedDay = null;
    this.events = [];
    this.bins = [];
    this.gaps = [];

    var eventElements = this.host.querySelectorAll('.cal-event');
    if (!eventElements) return;

    for (var i = eventElements.length; i--;) {
      var element = eventElements[i];
      element.parentNode.removeChild(element);
    }
  },

  /**
   * Displays events.
   * @param {Array} events Sorted list of events to display.
   */
  displayEvents: function(events) {
    var i = 0;
    var eventsLength = events.length;
    for (; i < eventsLength; i++) {
      this.displayEvent(events[i]);
    }

    this.fillAvailableGaps();
    this.setEventsWidth();
  },

  /**
   * Displays one given event.
   * @param {Object} event
   */
  displayEvent: function(event) {
    var eventElement = this.createEventElement();
    this.setEventTitle(eventElement, event);
    this.setEventTopPosition(eventElement, event);
    this.setEventHeight(eventElement, event);
    this.putEventIntoRightBin(event);

    var dayElement = this.getDayElementByDate(event.start);
    dayElement.appendChild(eventElement);
  },

  /**
   * Creates html element for an event.
   * @return {HTMLElement}
   */
  createEventElement: function() {
    var eventElement = document.createElement('div');
    eventElement.classList.add('cal-event');
    return eventElement;
  },

  /**
   * Displays event's title.
   * @param {HTMLElement} eventElement Element for which to display title.
   * @param {Object} event Event data.
   */
  setEventTitle: function(eventElement, event) {
    eventElement.textContent = event.title;
    eventElement.title = event.title;
  },

  /**
   * Sets event element's top/start position.
   * @param {HTMLElement} eventElement Element to position.
   * @param {Object} event Event data.
   */
  setEventTopPosition: function(eventElement, event) {
    var hours = event.start.getHours();
    var minutes = event.start.getMinutes();
    var top = hours * this.hourHeight;
    if (minutes) top += this.hourHeight / 2;
    eventElement.style.top = top + 'px';
  },

  /**
   * Sets event element's height.
   * @param {HTMLElement} eventElement Element for which to set height.
   * @param {Object} event Event data.
   */
  setEventHeight: function(eventElement, event) {
    var height = event.duration / 60 * this.hourHeight;
    eventElement.style.height = height + 'px';
  },

  /**
   * Sets information about event element's left/right position against other
   * events on the same day.
   * @param {Object} event Event data.
   */
  putEventIntoRightBin: function(event) {
    var eventDay = event.start.getDay();
    // Switch Sunday from week[0] to week[7].
    if (eventDay === 0) eventDay = 7;

    this.maybeCreateNewHelpersForDay(eventDay);

    var bins = this.bins[eventDay];
    if (!bins.length) {
      this.createFirstBinWithEvent(eventDay, event);
    } else {
      for (var i = 0, l = bins.length; i < l; i++) {
        if (event.start > bins[i]) {
          this.putEventIntoBin(eventDay, event, i);
          break;
        } else if (i === bins.length - 1) {
          this.createNewBinWithEvent(eventDay, event, i);
        }
      }
    }
  },

  /**
   * If we're displaying an event for a new day (no events were displayed for it
   * before), create group of helpers like bins and gaps.
   * @param {Date} day
   */
  maybeCreateNewHelpersForDay: function(day) {
    if (day === this.lastUpdatedDay) return;

    this.lastUpdatedDay = day;
    this.events[day] = [];
    this.bins[day] = [];
    this.gaps[day] = [];
  },

  /**
   * Creates the first bin in the day and puts the evnt into it.
   * @param {Number} day
   * @param {Object} event
   */
  createFirstBinWithEvent: function(day, event) {
    var bins = this.bins[day];
    var events = this.events[day];

    bins.push(event.end);
    events.push([event.start, event.end, 0, 1]);
  },

  /**
   * Gets a bin by index and puts the evnt there.
   * @param {Number} day
   * @param {Object} event
   * @param {Number} i Bin's index.
   */
  putEventIntoBin: function(day, event, i) {
    var gaps = this.gaps[day];
    var events = this.events[day];
    var bins = this.bins[day];
    var binEnd = bins[i];

    if (event.start - binEnd > 1) {
      if (!gaps[i]) gaps[i] = [];
      gaps[i].push([binEnd, event.start]);
    }

    bins[i] = event.end;
    events.push([event.start, event.end, i, 1]);
  },

  /**
   * Creates a new (not first) bin and puts the evnt there.
   * @param {Number} day
   * @param {Object} event
   * @param {Number} i Bin's index after which to create a new bin.
   */
  createNewBinWithEvent: function(day, event, i) {
    var bins = this.bins[day];
    var events = this.events[day];
    bins[i + 1] = event.end;
    events.push([event.start, event.end, i + 1, 1]);
  },

  /**
   * Fills available space in calendar by expanding events' width when it's
   * possible.
   */
  fillAvailableGaps: function() {
    // Day 1 is Monday. Since we put Sunday from day 0 to day 7, start from 1.
    var day = 1;
    var numberOfDaysWithEvents = this.events.length;

    for (; day <= numberOfDaysWithEvents; day++) {
      var eventsForCurrentDay = this.events[day];
      if (!eventsForCurrentDay) continue;

      var binsForCurrentDay = this.bins[day];
      var numberOfBinsForCurrentDay = binsForCurrentDay.length;
      if (numberOfBinsForCurrentDay <= 1) continue;

      var gapsForCurrentDay = this.gaps[day];
      if (!gapsForCurrentDay || !gapsForCurrentDay.length) continue;

      var eventIndex = 0;
      var numberOfEventsForCurrentDay = eventsForCurrentDay.length;
      for (; eventIndex < numberOfEventsForCurrentDay; eventIndex++) {
        var event = eventsForCurrentDay[eventIndex];
        this.maybeWidenEvent(day, event);
      }
    }
  },

  /**
   * If there's a gap, widen event's element to take all available space.
   * @param {Number} day
   * @param {Object} event
   */
  maybeWidenEvent: function(day, event) {
    var binsForCurrentDay = this.bins[day];
    var numberOfBinsForCurrentDay = binsForCurrentDay.length;
    var gapsForCurrentDay = this.gaps[day];
    var bin = event[2] + 1;

    binsLoop:
    while (bin < numberOfBinsForCurrentDay) {
      var gapsForCurrentBin = gapsForCurrentDay[bin];
      if (!gapsForCurrentBin) {
        if (event[0] < binsForCurrentDay[bin]) {
          break;
        } else {
          event[3]++;
          bin++;
          continue;
        }
      }

      var numberOfGaps = gapsForCurrentBin.length;
      var gapIndex = 0;
      for (; gapIndex < numberOfGaps; gapIndex++) {
        var gap = gapsForCurrentBin[gapIndex];
        if (event[0] < gap[0]) {
          break binsLoop;
        } else {
          if (event[1] > gap[1]) {
            break binsLoop;
          } else {
            event[3]++;
            continue;
          }
        }
      }
    }
  },

  /**
   * Gets information about event's column and width and sets left/right
   * position.
   */
  setEventsWidth: function() {
    var eventElements = this.host.querySelectorAll('.cal-event');
    var elementIndex = 0;
    var numberOfDaysWithEvents = this.events.length;

    // Day 1 is Monday. Since we put Sunday from day 0 to day 7, start from 1.
    var day = 1;

    for (; day <= numberOfDaysWithEvents; day++) {
      var eventsForCurrentDay = this.events[day];
      if (!eventsForCurrentDay) continue;

      var eventIndex = 0;
      var numberOfEventsForCurrentDay = eventsForCurrentDay.length;
      for (; eventIndex < numberOfEventsForCurrentDay; eventIndex++) {
        var numberOfBinsForCurrentDay = this.bins[day].length;
        var columnWidth = 100 / numberOfBinsForCurrentDay;

        var event = eventsForCurrentDay[eventIndex];
        var column = event[2];
        var width = event[3];

        var left = column * columnWidth;
        var right = 100 - left - width * columnWidth;
        eventElements[elementIndex].style.left = left + '%';
        eventElements[elementIndex].style.right = right + '%';
        elementIndex++;
      }
    }
  }
};

module.exports = Calendar;
