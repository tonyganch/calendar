var utils = require('./utils');

/**
 * The class manipulates calendar's data and stores its current state.
 * @constructor
 */
function CalendarModel() {
}

CalendarModel.prototype = {
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
  weekStart: null,

  /**
   * @type {?Date}
   */
  weekEnd: null,

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
   * Updates calendar's model with new data.
   * @param {HTMLElement} xml Events data.
   */
  update: function(xml) {
    // Dates.
    this.currentDay = this.getCurrentDayFromXml(xml);
    this.currentWeekDay = this.getCurrentWeekDay();
    this.weekStart = this.getWeekStart();
    this.weekEnd = this.getWeekEnd();

    // Events.
    this.lastUpdatedDay = null;
    this.bins = [];
    this.gaps = [];
    this.days = [];
    this.events = this.getEventsForCurrentWeekFromXml(xml);
  },

  /**
   * Gets current day from xml.
   * @param {HTMLElement} xml
   * @return {Date} Current day.
   */
  getCurrentDayFromXml: function(xml) {
    var todayElement = xml.getElementsByTagName('dayinweek')[0];
    var today = utils.getTextFromElement(todayElement);
    var timestamp = parseInt(today, 10);
    return utils.convertUnixTimestampToDate(timestamp);
  },

  getWeekDayByDate: function(date) {
    var weekDay = date.getDay();

    // Switch Sunday from week[0] to week[7], so a week starts with Monday.
    if (weekDay === 0) weekDay = 7;

    return weekDay;
  },

  /**
   * @return {Number} A number of current week day.
   */
  getCurrentWeekDay: function() {
    return this.getWeekDayByDate(this.currentDay);
  },

  getWeekStart: function() {
    var today = this.currentDay;
    var weekDay = this.currentWeekDay || this.getCurrentWeekDay();

    var weekStartDate = today.getDate() - weekDay + 1;
    return new Date(today.getFullYear(), today.getMonth(), weekStartDate);
  },

  getWeekEnd: function() {
    var weekStart = this.weekStart || this.getWeekStart();
    return weekStart - 1 + this.ONE_WEEK_IN_MS;
  },

  getDayHeadersForCurrentWeek: function() {
    var DAYS_IN_WEEK = 7;
    var headers = [];
    var weekStart = this.weekStart;

    for (var i = 0; i < DAYS_IN_WEEK; i++) {
      var currentDay = new Date(weekStart);
      var currentDate = weekStart.getDate() + 1;
      currentDay.setDate(currentDate);
      var header = this.formatDateForDayHeader(currentDay);
      headers.push(header);
    }

    return headers;
  },

  /**
   * Localizes date to display in day header.
   * @param {Date} date
   * @return {String}
   */
  formatDateForDayHeader: function(date) {
    if (typeof Intl !== 'undefined') {
      // Date formatters are supported.
      var formatOptions = {weekday: 'short', day: 'numeric', month: 'short'};
      return date.toLocaleString([], formatOptions);
    } else {
      // Fallback for IE.
      return date.toDateString();
    }
  },

  getEventsForCurrentWeekFromXml: function(xml) {
    var eventsForCurrentWeek = [];
    var events = xml.getElementsByTagName('item');

    for (var i = 0, l = events.length; i < l; i++) {
      var event = this.getEventDataFromElement(events, i);

      if (!this.eventIsPlannedForCurrentWeek(event)) continue;

      eventsForCurrentWeek.push(event);
    }

    return eventsForCurrentWeek;
  },

  getEventDataFromElement: function(elements, i) {
    var element = elements[i];

    var titleElement = element.getElementsByTagName('title')[0];
    var title = utils.getTextFromElement(titleElement);

    var startElement = element.getElementsByTagName('start')[0];
    var start = utils.getDateFromElement(startElement);
    this.roundEventStartTime(start);

    var hours = start.getHours();
    var minutes = start.getMinutes();
    var startInHours = hours + minutes / 60;

    var endElement = element.getElementsByTagName('end')[0];
    var end = utils.getDateFromElement(endElement);
    this.roundEventEndTime(end);

    var duration = this.getEventDurationInHours(start, end);

    return {
      id: i,
      title: title,
      start: start,
      startInHours: startInHours,
      end: end,
      duration: duration,
      weekDay: this.getWeekDayByDate(start),
      width: 1
    };
  },

  eventIsPlannedForCurrentWeek: function(event) {
    // Event ended before current week.
    if (event.end <= this.weekStart) return false;

    // Event starts after current week.
    if (event.start > this.weekEnd) return false;

    // All other variants are fine.
    return true;
  },

  /**
   * Rounds event's end time upward to the nearest EVENTS_TIME_STEP.
   * @param {Date} end Event's end time.
   */
  roundEventEndTime: function(end) {
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
   */
  roundEventStartTime: function(start) {
    var startMinutes = start.getMinutes();
    var startMinutesRemainder = startMinutes % this.EVENTS_TIME_STEP_IN_MINUTES;

    if (startMinutesRemainder) {
      var roundStartMinutes = startMinutes - startMinutesRemainder;
      start.setMinutes(roundStartMinutes);
    }

    start.setSeconds(0, 0);
  },

  getEventDurationInHours: function(start, end) {
    var duration = end - start + 1;
    return duration / 1000 / 60 / 60;
  },

  getEventsForCurrentWeek: function() {
    this.splitEventsByDays();
    this.sortEvents();
    this.putEventsIntoBins();
    this.fillAvailableGaps();

    return this.events;
  },

  /**
   * Splits events that last for multiple days into several one-day events.
   */
  splitEventsByDays: function() {
    for (var i = this.events.length; i--;) {
      this.splitEventByDays(this.events, i);
    }
  },

  /**
   * Splits event into several one-day events.
   * @param {Array} events List of events.
   * @param {Number} i Index of the event to split.
   */
  splitEventByDays: function(events, i) {
    var event = events[i];
    var end = event.end;

    // Skip one-day events.
    if (this.startsAndEndsTheSameDay(event)) return;

    var newStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    var hours = newStart.getHours();
    var minutes = newStart.getMinutes();
    var newStartInHours = hours + minutes / 60;

    var newDuration = this.getEventDurationInHours(newStart, end);

    var oneDayEvent = {
      title: event.title,
      start: newStart,
      startInHours: newStartInHours,
      end: end,
      duration: newDuration,
      weekDay: this.getWeekDayByDate(newStart),
      width: 1,
      id: events.length
    };

    events.push(oneDayEvent);

    event.end = new Date(oneDayEvent.start - 1);
    event.duration = this.getEventDurationInHours(event.start, event.end);

    this.splitEventByDays(events, i);
  },

  /**
   * Checks whether event lasts for several days.
   * @param {Object} event
   * @return {Boolean} True if event lasts for several days, false otherwise/
   */
  startsAndEndsTheSameDay: function(event) {
    var start = event.start;
    var startDate = start.getDate();
    var end = event.end;
    var endDate = end.getDate();

    return startDate === endDate && end - start < this.ONE_DAY_IN_MS;
  },

  /**
   * Sorts events by start time and duration (longer events go first).
   */
  sortEvents: function() {
    this.events.sort(function(first, second) {
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

  putEventsIntoBins: function() {
    for (var i = 0, l = this.events.length; i < l; i++) {
      var event = this.events[i];
      this.putEventIntoRightBin(event);
    }
  },

  putEventIntoRightBin: function(event) {
    var eventDay = this.getWeekDayByDate(event.start);

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
    this.days[day] = [];
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
    bins.push(event.end);

    this.days[day].push(event.id);
    event.bin = 0;
  },

  /**
   * Gets a bin by index and puts the evnt there.
   * @param {Number} day
   * @param {Object} event
   * @param {Number} i Bin's index.
   */
  putEventIntoBin: function(day, event, i) {
    var gaps = this.gaps[day];
    var bins = this.bins[day];
    var binEnd = bins[i];

    if (event.start - binEnd > 1) {
      if (!gaps[i]) gaps[i] = [];
      gaps[i].push([binEnd, event.start]);
    }

    bins[i] = event.end;
    this.days[day].push(event.id);
    event.bin = i;
  },

  /**
   * Creates a new (not first) bin and puts the evnt there.
   * @param {Number} day
   * @param {Object} event
   * @param {Number} i Bin's index after which to create a new bin.
   */
  createNewBinWithEvent: function(day, event, i) {
    var bins = this.bins[day];
    bins[i + 1] = event.end;
    this.days[day].push(event.id);
    event.bin = i + 1;
  },

  /**
   * Fills available space in calendar by expanding events' width when it's
   * possible.
   */
  fillAvailableGaps: function() {
    // Day 1 is Monday. Since we put Sunday from day 0 to day 7, start from 1.
    var day = 1;
    var numberOfDaysWithEvents = this.days.length;

    for (; day <= numberOfDaysWithEvents; day++) {
      var eventsForCurrentDay = this.days[day];
      if (!eventsForCurrentDay) continue;

      var binsForCurrentDay = this.bins[day];
      var numberOfBinsForCurrentDay = binsForCurrentDay.length;
      if (numberOfBinsForCurrentDay <= 1) continue;

      var gapsForCurrentDay = this.gaps[day];
      if (!gapsForCurrentDay || !gapsForCurrentDay.length) continue;

      var eventIndex = 0;
      var numberOfEventsForCurrentDay = eventsForCurrentDay.length;
      for (; eventIndex < numberOfEventsForCurrentDay; eventIndex++) {
        var eventId = eventsForCurrentDay[eventIndex];
        var event = this.events[eventId];
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
    var bin = event.bin + event.width;

    binsLoop:
    while (bin < numberOfBinsForCurrentDay) {
      var gapsForCurrentBin = gapsForCurrentDay[bin];
      if (!gapsForCurrentBin) {
        if (event.start < binsForCurrentDay[bin]) {
          // There are no gaps and event starts before all events in the next
          // bin end.
          break;
        } else {
          // There are no gaps but event starts after all events in the next bin
          // end, so we can widen the event.
          event.width++;
          bin++;
          continue;
        }
      }

      var numberOfGaps = gapsForCurrentBin.length;
      var gapIndex = 0;
      for (; gapIndex < numberOfGaps; gapIndex++) {
        var gap = gapsForCurrentBin[gapIndex];
        if (event.start < gap[0]) {
          // There is a gap in the next column but event start before that gap
          // so we cannot accomodate the event there.
          break binsLoop;
        } else {
          if (event.end > gap[1]) {
            // There is a gap in the next column that starts before the event,
            // but event ends after the gap, so the event is too big and we
            // cannot accomodate it in the gap.
            // But if it was the last gap, check if bin has empty space at that
            // time so maybe we can widen the event.
            if (event.start >= binsForCurrentDay[bin]) {
              gapsForCurrentDay[bin] = null;
              event.width++;
              this.maybeWidenEvent(day, event);
            }
            break binsLoop;
          } else {
            // There is a gap in the next column that starts before the event
            // and event is small enough to put it into the gap.
            event.width++;
            continue;
          }
        }
      }
    }
  },

  getNumberOfBinsByWeekDay: function(weekDay) {
    var bins = this.bins[weekDay];
    return bins ? bins.length : 0;
  }
};

module.exports = CalendarModel;
