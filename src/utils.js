var utils = {
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
   * Converts unix timestamp to Date object.
   * @param {Number} unixTimestamp
   * @return {Date}
   */
  convertUnixTimestampToDate: function(unixTimestamp) {
    return new Date(unixTimestamp * 1000);
  },

  /**
   * Filters events for a given week.
   * @param {Array} events List of events to filter.
   * @param {Date} weekStart Start date of the week.
   * @return {Array} Filtered list of events.
   */
  filterEventsByWeek: function(events, weekStart) {
    var weekEnd = this.getWeekEnd(weekStart);
    return events.filter(function(event) {
      return weekStart <= event.start || event.start <= weekEnd;
    });
  },

  /**
   * Gets current day from xml.
   * @param {HTMLElement} xml
   * @return {Date} Current day.
   */
  getCurrentDayFromXml: function(xml) {
    var today = xml.getElementsByTagName('dayinweek')[0].textContent;
    var timestamp = parseInt(today, 10);
    return this.convertUnixTimestampToDate(timestamp);
  },

  /**
   * Gets event's duration in minutes.
   * @param {Date} start Start time of the event.
   * @param {Date} end End time of the event.
   * @return {Number}
   */
  getEventDurationInMinutes: function(start, end) {
    var duration = end - start + 1;
    return duration / 1000 / 60;
  },

  /**
   * Filters events for given week only and sorts them by start time and
   * duration.
   * @return {Array} List of filtered and sorted events.
   */
  getEventsByWeekFromXml: function(xml, weekStart) {
    var events = this.getEventsFromXml(xml);
    events = this.filterEventsByWeek(events, weekStart);
    this.splitEventsByDays(events);
    this.sortEvents(events);
    return events;
  },

  /**
   * Gets all events from xml.
   * @param {HTMLElement} xml
   * @return {Array} List of events in order of appearance in xml.
   */
  getEventsFromXml: function(xml) {
    var self = this;
    var events = xml.getElementsByTagName('item');

    // Convert a collection to an array.
    return Array.prototype.map.call(events, function(event) {
      var title = event.getElementsByTagName('title')[0].textContent;

      var start = event.getElementsByTagName('start')[0].textContent;
      var startTimestamp = parseInt(start, 10);
      var startDate = self.convertUnixTimestampToDate(startTimestamp);
      self.roundEventStartTime(startDate);

      var end = event.getElementsByTagName('end')[0].textContent;
      var endTimestamp = parseInt(end, 10);
      var endDate = self.convertUnixTimestampToDate(endTimestamp);
      self.roundEventEndTime(endDate);

      var duration = self.getEventDurationInMinutes(startDate, endDate);

      return {
        title: title,
        start: startDate,
        end: endDate,
        duration: duration
      };
    });
  },

  /**
   * Gets end date/timestamp for the week.
   * @param {Date} weekStart Week's start date.
   * @return {Date} Week's end date.
   */
  getWeekEnd: function(weekStart) {
    return weekStart + this.ONE_WEEK_IN_MS - 1;
  },

  /**
   * Gets start date/timestamp for the week that contains a given date.
   * @param {Date} date Any date within the week.
   * @return {Date} Start date.
   */
  getWeekStartByDate: function(date) {
    var weekDay = date.getDay();

    // Switch Sunday from week[0] to week[7], so a week starts with Monday.
    if (weekDay === 0) weekDay = 7;

    var weekStartDate = date.getDate() - weekDay + 1;
    return new Date(date.getFullYear(), date.getMonth(), weekStartDate);
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

  /**
   * Sorts events by start time and duration (longer events go first).
   * @param {Array} events List of events to be sorted.
   */
  sortEvents: function(events) {
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
   */
  splitEventByDays: function(events, i) {
    var event = events[i];
    var end = event.end;

    // Skip one-day events.
    if (this.startsAndEndsTheSameDay(event)) return;

    var newStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    var newDuration = this.getEventDurationInMinutes(newStart, end);
    var oneDayEvent = {
      title: event.title,
      start: newStart,
      end: end,
      duration: newDuration
    };

    events.push(oneDayEvent);

    event.end = new Date(oneDayEvent.start - 1);
    event.duration = this.getEventDurationInMinutes(event.start, event.end);

    this.splitEventByDays(events, i);
  },

  /**
   * Splits events that last for multiple days into several one-day events.
   * @param {Array} events List of events to split.
   */
  splitEventsByDays: function(events) {
    for (var i = events.length; i--;) {
      this.splitEventByDays(events, i);
    }
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
  }
};

module.exports = utils;
