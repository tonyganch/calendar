# Calendar

This is a simple calendar viewer that loads data from xml.    
See demo here: http://tonyganch.com/calendar.

## Task

The task is a modification of
[bin packing problem](https://en.wikipedia.org/wiki/Bin_packing_problem).    
Given a number of events, display them on the grid effectively:

- events should not overlap;
- events should take maximum space;
- minimal time interval is 30 minutes (i.e. event 09:05–09:40 should be displayed as 09:00–10:00).

## XML format

The app has no client-side validation so it assumes that xml you're trying to load is valid and follows this format:

```xml
<xml>
  <dayinweek hr="30.03.2016 15:07:18">1459350438</dayinweek>
  <items>
    <item>
      <title>Overnight</title>
      <start hr="26.03.2016 02:00:00">1458957600</start>
      <end hr="27.03.2016 06:30:00">1459060200</end>
    </item>
  </items>
</xml>
```

- `<dayinweek>` represents current day;
- `<item>` represents event's data.

Note that all dates should be provided in
[Unix time](https://en.wikipedia.org/wiki/Unix_time) format.    
Also note that `hr` attribute is optional and the app ignores it.

## Build

JS files are build using Browserify.    
All output files are located in project root directory to make app work nicely
with GitHub pages.

To build app locally:

```bash
# Install dev dependencies
npm i
# Build files
npm run build
# Optionally, process js files with uglify
npm run uglify
```
