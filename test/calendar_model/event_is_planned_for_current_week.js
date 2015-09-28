var assert = require('power-assert');
var Calendar = require('../../src/calendar_model');

/**
 * Depends on:
 * - this.weekStart;
 * - this.weekEnd.
 */
describe('CalendarModel#eventIsPlannedForCurrentWeek()', function() {
  var calendar;

  beforeEach(function() {
    calendar = new Calendar();
    calendar.weekStart = new Date(Date.UTC(2015, 9, 28));
    calendar.weekEnd = new Date(Date.UTC(2015, 10, 4));
  });

  it('Event that starts and ends prev. week should return false', function() {
    var event = {
      start: new Date(Date.UTC(2015, 9, 21)),
      end: new Date(Date.UTC(2015, 9, 22))
    };

    assert(calendar.eventIsPlannedForCurrentWeek(event) === false);
  });

  it('Event that starts prev. week and ends this week should return true', function() {
    var event = {
      start: new Date(Date.UTC(2015, 9, 21)),
      end: new Date(Date.UTC(2015, 9, 29))
    };

    assert(calendar.eventIsPlannedForCurrentWeek(event) === true);
  });

  it('Event that starts prev. week and ends next week should return true', function() {
    var event = {
      start: new Date(Date.UTC(2015, 9, 21)),
      end: new Date(Date.UTC(2015, 10, 8))
    };

    assert(calendar.eventIsPlannedForCurrentWeek(event) === true);
  });

  it('Event that starts and ends this week should return true', function() {
    var event = {
      start: new Date(Date.UTC(2015, 9, 29)),
      end: new Date(Date.UTC(2015, 9, 30))
    };

    assert(calendar.eventIsPlannedForCurrentWeek(event) === true);
  });

  it('Event that starts this week and ends next week should return true', function() {
    var event = {
      start: new Date(Date.UTC(2015, 9, 29)),
      end: new Date(Date.UTC(2015, 10, 8))
    };

    assert(calendar.eventIsPlannedForCurrentWeek(event) === true);
  });

  it('Event that starts and ends next week should return false', function() {
    var event = {
      start: new Date(Date.UTC(2015, 10, 7)),
      end: new Date(Date.UTC(2015, 10, 8))
    };


    assert(calendar.eventIsPlannedForCurrentWeek(event) === false);
  });
});
