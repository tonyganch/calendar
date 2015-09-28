var utils = require('./utils');

/**
 * The class manipulates calendar's data and stores its current state.
 * @constructor
 */
function CalendarModel() {
}

CalendarModel.prototype = {
  /**
   * Number of days in week.
   * @const
   * @type {Number}
   */
  DAYS_IN_WEEK: 7,

  /**
   * Time step to which all event times should be rounded.
   * @const
   * @type {Number}
   */
  EVENTS_TIME_STEP_IN_MINUTES: 30,

  /**
   * @const
   * @type {Number}
   */
  ONE_DAY_IN_MS: 86400000,

  /**
   * @const
   * @type {Number}
   */
  ONE_WEEK_IN_MS: 604800000,

  /**
   * @type {?Date}
   */
  currentDay: null,

  /**
   * @type {?Number}
   */
  currentWeekDay: null,

  /**
   * @type {?Date}
   */
  weekEnd: null,

  /**
   * @type {?Date}
   */
  weekStart: null,

  /**
   * Events data grouped by days.
   * @type {Array}
   * @private
   */
  _days: [],

  /**
   * List of displayed events. Contains information about start/end time of the
   * events, its column index and width in columns. Grouped by date.
   * @type {Array}
   * @private
   */
  _events: [],

  /**
   * Week day of the last day for which events were displayed.
   * @type {?Number}
   * @private
   */
  _lastUpdatedDay: null,

  /**
   * Gets a number of current week day where 0 is Monday and 6 is Sunday.
   * @returns {Number} A number of current week day.
   */
  getCurrentWeekDay: function() {
    return this._getWeekDayByDate(this.currentDay);
  },

  /**
   * Gets a list of formatted day headers for current week. For example,
   * `Tue 22 Sep`.
   * @returns {Array<String>} A list of headers.
   */
  getDayHeadersForCurrentWeek: function() {
    var days = this._days;
    return utils.map(days, function(day) {
      return day.header;
    });
  },

  /**
   * Gets events for current week.
   * @returns {?Array<Object>} A list of events.
   */
  getEventsForCurrentWeek: function() {
    return this._events;
  },

  /**
   * Gets a total number of bins for current week's given week day.
   * @param {Number} weekDay Number of week day.
   * @returns {Number}
   */
  getNumberOfBinsByWeekDay: function(weekDay) {
    var bins = this._days[weekDay].bins;
    return bins ? bins.length : 0;
  },

  /**
   * Updates calendar's model with new data.
   * @param {HTMLElement} xml Events data.
   */
  update: function(xml) {
    // Dates.
    this.currentDay = this._getCurrentDayFromXml(xml);
    this.currentWeekDay = this.getCurrentWeekDay();
    this.weekStart = this._getWeekStart();
    this.weekEnd = this._getWeekEnd();

    // Events.
    this._lastUpdatedDay = null;
    this._days = this._getDaysData();
    this._events = this._getEventsForCurrentWeekFromXml(xml);
  },

  /**
   * Creates a new bin and puts the event there.
   * @param {Number} dayNumber
   * @param {Object} event
   */
  _createNewBinWithEvent: function(dayNumber, event) {
    var day = this._days[dayNumber];
    var bins = day.bins;
    var id = bins.length;

    var gapBeforeEvent = [day.start.valueOf(), event.start.valueOf() - 1];
    var gapAfterEvent = [event.end.valueOf() + 1, day.end.valueOf()];

    bins.push({
      id: id,
      end: event.end,
      events: [event.id],
      gaps: [gapBeforeEvent, gapAfterEvent]
    });

    event.bin = id;
  },

  /**
   * Checks if the event is held this week.
   * @param {Object} event
   * @returns {boolean} True if the event is held this week, false otherwise.
   * @private
   */
  _eventIsPlannedForCurrentWeek: function(event) {
    // Event ended before current week.
    if (event.end <= this.weekStart) return false;

    // Event starts after current week.
    if (event.start > this.weekEnd) return false;

    // All other variants are fine.
    return true;
  },

  /**
   * Fills available space in calendar by expanding events' width when it's
   * possible.
   * @param {Array<Object>} events
   * @private
   */
  _fillAvailableGaps: function(events) {
    for (var i = 0, l = events.length; i < l; i++) {
      // Pick an event.
      var event = events[i];
      var binNumber = event.bin;
      var day = this._days[event.weekDay];
      var numberOfBinsInThisDay = day.bins.length;

      for (; binNumber < numberOfBinsInThisDay; binNumber++) {
        // Pick gaps from next bin.
        var bin = day.bins[binNumber + 1];
        if (!bin) break;

        var gaps = bin.gaps;
        var eventWasWidened = this._maybeWidenEvent(event, gaps);
        if (!eventWasWidened) break;
      }
    }
  },

  /**
   * Localizes date to display in day header.
   * @param {Date} date
   * @returns {String}
   * @private
   */
  _formatDateForDayHeader: function(date) {
    if (typeof Intl !== 'undefined') {
      // Date formatters are supported.
      var formatOptions = {weekday: 'short', day: 'numeric', month: 'short'};
      return date.toLocaleString([], formatOptions);
    } else {
      // Fallback for IE.
      return date.toDateString();
    }
  },

  /**
   * Gets current day from xml.
   * @param {HTMLElement} xml
   * @returns {Date} Current day.
   * @private
   */
  _getCurrentDayFromXml: function(xml) {
    var todayElement = xml.getElementsByTagName('dayinweek')[0];
    var today = utils.getTextFromElement(todayElement);
    var timestamp = parseInt(today, 10);
    return utils.convertUnixTimestampToDate(timestamp);
  },

  /**
   * Gets information on all days: start/end time and headers.
   * @returns {Array<Object>}
   * @private
   */
  _getDaysData: function() {
    var days = [];
    var weekStart = this.weekStart;

    for (var i = 0; i < this.DAYS_IN_WEEK; i++) {
      var start = new Date(weekStart);
      var date = weekStart.getDate() + i;
      start.setDate(date);

      var header = this._formatDateForDayHeader(start);

      days.push({
        start: start,
        end: start - 1 + this.ONE_DAY_IN_MS,
        header: header,
        events: [],
        bins: []
      });
    }

    return days;
  },

  /**
   * Gets event data from html element.
   * @param {NodeList} elements List of events elements.
   * @param {Number} i Index of the element from which to get data.
   * @returns {Object}
   * @private
   */
  _getEventDataFromElement: function(elements, i) {
    var element = elements[i];

    var titleElement = element.getElementsByTagName('title')[0];
    var title = utils.getTextFromElement(titleElement);

    var startElement = element.getElementsByTagName('start')[0];
    var start = utils.getDateFromElement(startElement);
    this._roundEventStartTime(start);

    var hours = start.getHours();
    var minutes = start.getMinutes();
    var startInHours = hours + minutes / 60;

    var endElement = element.getElementsByTagName('end')[0];
    var end = utils.getDateFromElement(endElement);
    this._roundEventEndTime(end);

    var duration = this._getEventDurationInHours(start, end);

    return {
      id: i,
      title: title,
      start: start,
      startInHours: startInHours,
      end: end,
      duration: duration,
      weekDay: this._getWeekDayByDate(start),
      width: 1
    };
  },

  /**
   * Gets event duration in hours.
   * @param {Date} start Event start time.
   * @param {Date} end Event end time.
   * @returns {Number}
   * @private
   */
  _getEventDurationInHours: function(start, end) {
    var duration = end - start + 1;
    return duration / 1000 / 60 / 60;
  },

  /**
   * Gets a list of events for current week.
   * @param {HTMLElement} xml Xml from which to get data.
   * @returns {Array<Object>} A list of event data.
   * @private
   */
  _getEventsDataFromXml: function(xml) {
    var eventsForCurrentWeek = [];
    var events = xml.getElementsByTagName('item');

    for (var i = 0, l = events.length; i < l; i++) {
      var event = this._getEventDataFromElement(events, i);

      if (!this._eventIsPlannedForCurrentWeek(event)) continue;

      eventsForCurrentWeek.push(event);
    }

    return eventsForCurrentWeek;
  },

  _getEventsForCurrentWeekFromXml: function(xml) {
    var events = this._getEventsDataFromXml(xml);
    this._splitEventsByDays(events);
    this._sortEvents(events);
    this._groupEventsByDays(events);

    this._groupEventsByBins(events);
    this._fillAvailableGaps(events);
    return events;
  },

  /**
   * Gets number of week day for a given date where 0 is Monday and 6 is Sunday.
   * @param {Date} date
   * @returns {Number}
   * @private
   */
  _getWeekDayByDate: function(date) {
    var weekDay = date.getDay();

    // Switch Sunday from week[0] to week[7], so a week starts with Monday.
    if (weekDay === 0) weekDay = 7;

    return weekDay - 1;
  },

  /**
   * Gets current week's end date.
   * @returns {Date}
   * @private
   */
  _getWeekEnd: function() {
    var weekStart = this.weekStart || this._getWeekStart();
    return new Date(weekStart - 1 + this.ONE_WEEK_IN_MS);
  },

  /**
   * Gets current week's start date.
   * @returns {Date}
   * @private
   */
  _getWeekStart: function() {
    var today = this.currentDay;
    var weekDay = this.currentWeekDay || this.getCurrentWeekDay();

    var weekStartDate = today.getDate() - weekDay;
    return new Date(today.getFullYear(), today.getMonth(), weekStartDate);
  },

  /**
   * Groups events by days.
   * @param {Array} events
   * @private
   */
  _groupEventsByDays: function(events) {
    for (var i = 0, l = events.length; i < l; i++) {
      var event = events[i];
      var weekDay = this._getWeekDayByDate(event.start);
      var day = this._days[weekDay];
      day.events.push(i);
    }
  },

  /**
   * If there's a gap, widen event's element to take all available space.
   * @param {Object} event
   * @param {Array} gaps
   * @returns {Boolean} If the event was widened.
   * @private
   */
  _maybeWidenEvent: function(event, gaps) {
    var i = 0;
    var numberOfGaps = gaps.length;

    for (; i < numberOfGaps; i++) {
      var gap = gaps[i];

      if (event.start.valueOf() > gap[1]) {
        // Remove gap and move to the next gap.
        gaps.splice(i, 1);
        i--;
        numberOfGaps--;
      } else if (event.start.valueOf() < gap[0] ||
          event.end.valueOf() > gap[1]) {
        // Move to another event.
        break;
      } else {
        // Edit gap.
        if (event.end.valueOf() === gap[1]) {
          // Remove gap.
          gaps.splice(i, 1);
          i--;
          numberOfGaps--;
        } else {
          gap[0] = event.end.valueOf() + 1;
        }

        event.width++;
        return true;
      }
    }

    return false;
  },

  /**
   * Gets a bin by index and puts the event there.
   * @param {Object} event
   * @param {Object} bin
   * @private
   */
  _putEventIntoBin: function(event, bin) {
    bin.events.push(event.id);
    bin.end = event.end;
    event.bin = bin.id;

    var gaps = bin.gaps;
    var gap = gaps[gaps.length - 1];

    if (gap[0] === event.start.valueOf()) {
      gap[0] = event.end.valueOf() + 1;
    } else if (gap[1] === event.end.valueOf()) {
      gap[1] = event.start - 1;
    } else {
      var newGap = [gap[0], event.start.valueOf() - 1];
      gaps.splice(gaps.length - 1, 0, newGap);
      gap[0] = event.end.valueOf() + 1;
    }
  },

  /**
   * Finds a right bin for the event and puts the event there. Creates a bin if
   * it's needed.
   * @param {Object} event
   * @param {Number} dayNumber
   * @private
   */
  _putEventIntoRightBin: function(event, dayNumber) {
    var bins = this._days[dayNumber].bins;
    if (!bins.length) {
      this._createNewBinWithEvent(dayNumber, event);
    } else {
      for (var i = 0, l = bins.length; i < l; i++) {
        if (event.start > bins[i].end) {
          this._putEventIntoBin(event, bins[i]);
          break;
        } else if (i === bins.length - 1) {
          this._createNewBinWithEvent(dayNumber, event);
        }
      }
    }
  },

  /**
   * Divides events into bins.
   * @private
   */
  _groupEventsByBins: function(events) {
    for (var i = 0, l = this.DAYS_IN_WEEK; i < l; i++) {
      this._putEventsIntoRightBins(events, i);
    }
  },

  /**
   * Divides events from a given day into bins.
   * @param {Array<Object>} events
   * @param {Number} dayNumber
   * @private
   */
  _putEventsIntoRightBins: function(events, dayNumber) {
    var day = this._days[dayNumber];
    var dayEvents = day.events;
    for (var i = 0, l = dayEvents.length; i < l; i++) {
      var event = events[dayEvents[i]];
      this._putEventIntoRightBin(event, dayNumber);
    }
  },

  /**
   * Rounds event's end time upward to the nearest EVENTS_TIME_STEP.
   * @param {Date} end Event's end time.
   * @private
   */
  _roundEventEndTime: function(end) {
    var endMinutes = end.getMinutes();
    var endMinutesRemainder = endMinutes % this.EVENTS_TIME_STEP_IN_MINUTES;

    if (endMinutesRemainder) {
      var roundEndMinutes = endMinutes + 30 - endMinutesRemainder;
      end.setMinutes(roundEndMinutes);
    }

    end.setSeconds(0, -1);
  },

  /**
   * Rounds event's start time downward to the nearest EVENTS_TIME_STEP.
   * @param {Date} start Event's start time.
   * @private
   */
  _roundEventStartTime: function(start) {
    var startMinutes = start.getMinutes();
    var startMinutesRemainder = startMinutes % this.EVENTS_TIME_STEP_IN_MINUTES;

    if (startMinutesRemainder) {
      var roundStartMinutes = startMinutes - startMinutesRemainder;
      start.setMinutes(roundStartMinutes);
    }

    start.setSeconds(0, 0);
  },

  /**
   * Slices a one-day part from the end of a multiple-days event.
   * @param {Array<Object>} events
   * @param {Number} i
   * @returns {Object}
   * @private
   */
  _sliceOneDayFromEventEnd: function(events, i) {
    var event = events[i];
    var end = event.end;

    var sliceStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    var hours = sliceStart.getHours();
    var minutes = sliceStart.getMinutes();
    var sliceStartInHours = hours + minutes / 60;

    var sliceDuration = this._getEventDurationInHours(sliceStart, end);

    var slice = {
      title: event.title,
      start: sliceStart,
      startInHours: sliceStartInHours,
      end: end,
      duration: sliceDuration,
      weekDay: this._getWeekDayByDate(sliceStart),
      width: 1,
      id: events.length
    };

    event.end = new Date(sliceStart - 1);
    event.duration = this._getEventDurationInHours(event.start, event.end);

    return slice;
  },

  /**
   * Sorts events by start time and duration (longer events go first).
   * @param {Array<Object>} events List of events to sort.
   * @private
   */
  _sortEvents: function(events) {
    events.sort(function(first, second) {
      if (first.start < second.start) {
        // First event start earlier than the second one.
        return -1;
      } else if (first.start > second.start) {
        // First event starts later than the second one.
        return 1;
      } else if (first.duration < second.duration) {
        // First event starts the same time as the second one but last shorter.
        return -1;
      } else if (first.duration > second.duration) {
        // First event starts the same time as the second one but last longer.
        return 1;
      } else {
        // Both event start the same time and have the same duration.
        return 1;
      }
    });
  },

  /**
   * Splits event into several one-day events.
   * @param {Array} events List of events.
   * @param {Number} i Index of the event to split.
   * @private
   */
  _splitEventByDays: function(events, i) {
    var event = events[i];

    // Skip one-day events.
    if (this._startsAndEndsTheSameDay(event)) return;

    var slice = this._sliceOneDayFromEventEnd(events, i);

    if (this._eventIsPlannedForCurrentWeek(event)) {
      if (this._eventIsPlannedForCurrentWeek(slice)) events.push(slice);
      this._splitEventByDays(events, i);
    } else {
      if (this._eventIsPlannedForCurrentWeek(slice)) events[i] = slice;
    }
  },

  /**
   * Splits events that last for multiple days into several one-day events.
   * @private
   */
  _splitEventsByDays: function(events) {
    for (var i = events.length; i--;) {
      this._splitEventByDays(events, i);
    }
  },

  /**
   * Checks whether event lasts for several days.
   * @param {Object} event
   * @returns {Boolean} True if event lasts for several days, false otherwise.
   * @private
   */
  _startsAndEndsTheSameDay: function(event) {
    var start = event.start;
    var startDate = start.getDate();
    var end = event.end;
    var endDate = end.getDate();

    return startDate === endDate && end - start < this.ONE_DAY_IN_MS;
  }
};

module.exports = CalendarModel;
