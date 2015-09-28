// jscs:disable maximumLineLength

var assert = require('power-assert');
var Calendar = require('../src/calendar_model');
var utils = require('./utils');

describe('(1) Filter events.', function() {
  it('Event that starts and ends prev. week should not be displayed',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/1.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 0);
  });

  it('Event that starts prev. week and ends this week should be displayed',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/2.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length !== 0);
  });

  it('Event that starts prev. week and ends next week should be displayed',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/3.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length !== 0);
  });

  it('Event that starts and ends this week should be displayed', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/4.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length !== 0);
  });

  it('Event that starts this week and ends next week should be displayed',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/5.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length !== 0);
  });

  it('Event that starts and ends next week should not be displayed', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/6.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 0);
  });
});

describe('(2) Split events by days.', function() {
  it('Event that starts and ends this Tuesday should be displayed as one event',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/7.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 1);
  });

  it('Event that starts this Tuesday and ends this Wednesday should be ' +
      'displayed as two events', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/8.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 2);
  });

  it('Event that starts prev. Saturday and ends this Tuesday should be ' +
      'displayed as two events', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/9.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 2);
  });

  it('Event that starts prev. Saturday and ends next Tuesday should be ' +
      'displayed as seven events', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/10.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 7);
  });

  it('Event that starts this Friday and ends next Tuesday should be ' +
      'displayed as three events', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/11.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events.length === 3);
  });
});

describe('(3) Divide events into bins.', function() {
  it('When there is only only one event there should be only one bin',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/12.xml');
    calendar.update(xml);

    var monday = calendar._days[0];
    assert(monday.bins.length === 1);
  });

  it('When there is only one event it should be put into the first bin',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/12.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].bin === 0);
  });

  it('When there are two not overlapping events there should be only one bin',
      function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/13.xml');
    calendar.update(xml);

    var monday = calendar._days[0];
    assert(monday.bins.length === 1);
  });

  it('When there are two not overlapping events they both should be put into ' +
      'the first bin', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/13.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].bin === 0);
    assert(events[1].bin === 0);
  });

  it('When there are two events that start at the same time there should be ' +
      'two bins', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/14.xml');
    calendar.update(xml);

    var monday = calendar._days[0];
    assert(monday.bins.length === 2);
  });

  it('When there are two events that start at the same time and both have ' +
      'the same duration time, the first one should be put into the first ' +
      'bin, and the other one — to the second (test order 1)', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/14.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].title === 'Event #2');
    assert(events[0].bin === 0);
    assert(events[1].title === 'Event #1');
    assert(events[1].bin === 1);
  });

  it('When there are two events that start at the same time and both have ' +
      'the same duration time, the first one should be put into the first ' +
      'bin, and the other one — to the second (test order 2)', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/15.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].title === 'Event #1');
    assert(events[0].bin === 0);
    assert(events[1].title === 'Event #2');
    assert(events[1].bin === 1);
  });

  it('When there are two events that start at the same time and have ' +
      'different duration time, the one that lasts less should be put ' +
      'into the first bin, and the other one — to the second', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/16.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].title === 'One-hour event');
    assert(events[0].bin === 0);
    assert(events[1].title === 'Two-hours event');
    assert(events[1].bin === 1);
  });

  it('When there are two overlapping events that have different start time ' +
      'the one that starts earlier should be put into the first bin, and ' +
      'the other one — to the second', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/17.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].title === 'Event 8 am');
    assert(events[0].bin === 0);
    assert(events[1].title === 'Event 9 am');
    assert(events[1].bin === 1);
  });

  it('Mixed case 1', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/18.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].title === 'Event #3');
    assert(events[0].bin === 0);
    assert(events[1].title === 'Event #1');
    assert(events[1].bin === 1);
    assert(events[2].title === 'Event #4');
    assert(events[2].bin === 0);
    assert(events[3].title === 'Event #2');
    assert(events[3].bin === 2);
  });

  it('Mixed case 2', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/24.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].title === 'Event #1');
    assert(events[0].bin === 0);
    assert(events[1].title === 'Event #2');
    assert(events[1].bin === 0);
  });
});

describe('(4) Fill available space', function() {
  it('Case 1', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/19.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].width === 1);
    assert(events[1].width === 1);
    assert(events[2].width === 2);
  });

  it('Case 2', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/20.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].width === 2);
    assert(events[1].width === 1);
    assert(events[2].width === 1);
  });

  it('Case 3', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/21.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].width === 1);
    assert(events[1].width === 1);
    assert(events[2].width === 1);
    assert(events[3].width === 2);
  });

  it('Case 4', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/22.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].width === 1);
    assert(events[1].width === 1);
    assert(events[2].width === 2);
    assert(events[3].width === 2);
  });

  it('Case 5', function() {
    var calendar = new Calendar();
    var xml = utils.getXmlFromFile('data/23.xml');
    calendar.update(xml);

    var events = calendar.getEventsForCurrentWeek();
    assert(events[0].width === 1);
    assert(events[1].width === 1);
    assert(events[2].width === 2);
    assert(events[3].width === 1);
    assert(events[4].width === 1);
  });
});
