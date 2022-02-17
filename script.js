//check if browser supports storage
let hasStorage = false;
if (typeof Storage !== "undefined") {
  hasStorage = true;
} else {
  hasStorage = false;
}

//prevents caching of requested files
$.ajaxSetup({ cache: false });

//the default schedule
let defaultAllSchedules = JSON.parse(
  '[[{"name":"1","start":"7:40","end":"8:30"},{"name":"2","start":"8:35","end":"9:30"},{"name":"3","start":"9:35","end":"10:27"},{"name":"Break","start":"10:27","end":"10:42"},{"name":"4","start":"10:47","end":"11:39"},{"name":"5","start":"11:44","end":"12:36"},{"name":"Lunch","start":"12:36","end":"13:06"},{"name":"6","start":"13:11","end":"14:03"},{"name":"7","start":"14:08","end":"15:00"}],[{"name":"1","start":"7:40","end":"8:30"},{"name":"2","start":"8:35","end":"10:10"},{"name":"Break","start":"10:10","end":"10:25"},{"name":"4","start":"10:30","end":"12:05"},{"name":"Tutorial","start":"12:10","end":"12:50"},{"name":"Lunch","start":"12:50","end":"13:20"},{"name":"6","start":"13:25","end":"15:00"}],[{"name":"1","start":"7:40","end":"8:30"},{"name":"3","start":"8:35","end":"10:10"},{"name":"Break","start":"10:10","end":"10:25"},{"name":"5","start":"10:30","end":"12:05"},{"name":"Lunch","start":"12:05","end":"12:35"},{"name":"7","start":"12:40","end":"14:15"}],[{"name":"1","start":"7:40","end":"8:30"},{"name":"2","start":"8:35","end":"10:10"},{"name":"Break","start":"10:10","end":"10:25"},{"name":"4","start":"10:30","end":"12:05"},{"name":"Tutorial","start":"12:10","end":"12:50"},{"name":"Lunch","start":"12:50","end":"13:20"},{"name":"6","start":"13:25","end":"15:00"}],[{"name":"1","start":"7:40","end":"8:30"},{"name":"3","start":"8:35","end":"10:10"},{"name":"Break","start":"10:10","end":"10:25"},{"name":"5","start":"10:30","end":"12:05"},{"name":"Lunch","start":"12:05","end":"12:35"},{"name":"7","start":"12:40","end":"14:15"}]]'
);

let latestIntervalID;

//used to change the time for debugging
function newDebugDate() {
  let date = new Date();

  let hours = 0;
  let minutes = hours * 60 + 0;
  let seconds = minutes * 60 + 0;
  let ms = seconds * 1000 + 0;
  date.setTime(date.getTime() + ms);
  return date;
}

let override;

//get the schedule json in case it's been updated
fetch("https://gist.githubusercontent.com/piguyisme/e652e0a5009f17efde347c390767d069/raw/schedule.json")
.then(
  (data) => {
    if (JSON.parse(data) != defaultAllSchedules) {
      defaultAllSchedules = JSON.parse(data);
      generateSchedule(defaultAllSchedules);
    }
  }
);

//get the override data for rallies and stuff
fetch("https://gist.githubusercontent.com/piguyisme/db88af35c569b7b5a8aff60c679f527c/raw/overrides.json")
.then(
  (data) => {
    override = JSON.parse(data);
    generateSchedule(defaultAllSchedules);
  }
);

/**
 * Generate list of time events (start/ends)
 * @param {Object[]} allSchedules - Array of all schedules in the week
 */
function generateSchedule(allSchedules) {
  let dayNum = newDebugDate().getDay();
  let currentSchedule;
  if (override) {
    const curDate = newDebugDate();
    const dateString = `${curDate.getDate()}-${
      curDate.getMonth() + 1
    }-${curDate.getFullYear()}`;

    if (override[dateString]) {
      currentSchedule = override[dateString];
    } else {
      currentSchedule = allSchedules[dayNum - 1];
    }
  } else {
    currentSchedule = allSchedules[dayNum - 1];
  }
  if ((dayNum == 0 || dayNum == 6) && !override) {
    $("#timer").text("No school today!");
    return;
  } else {
    $("#periods").html(
      "<tr><th>Period</th><th>Start</th><th>End</th></tr>"
    );

    //will have the time events pushed to it
    let times = [];
    if (latestIntervalID) {
      clearInterval(latestIntervalID);
    }

    //for each period
    for (let i = 0; i < currentSchedule.length; i++) {
      currentP = currentSchedule[i];

      //converts the 00:00 format to an actual date object, then turn it into a ms timestamp
      let start = timeStringToDate(currentP.start);
      let end = timeStringToDate(currentP.end);

      //push the start and end timestamps to times
      times.push({
        time: start.getTime(),
        name: "Start of " + currentP.name,
      });
      times.push({
        time: end.getTime(),
        name: "End of " + currentP.name,
      });

      let startAPM = start.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      let endAPM = end.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      //Add period to schedule in the DOM
      let pTitle =
        currentP.name +
        (currentP.name != "Break" &&
        currentP.name != "Lunch" &&
        getClassName(currentP.name)
          ? ": " + getClassName(currentP.name)
          : "");
      document.getElementById("periods").innerHTML += `<tr${
        currentP.name == "Break" || currentP.name == "Lunch"
          ? " class='break'"
          : " value=" + currentP.name
      }>
        <td>${pTitle}</td>
        <td>${startAPM}</td>
        <td>${endAPM}</td>
      </tr>`;
    }

    $(".pinput").each(function (i) {
      $(this).val(getClassName(String(i + 1)));
    });

    //Render timer every 1 ms
    latestIntervalID = setInterval(renderTimer, 1, times, dayNum);
  }
}

/**
 * Get the user-defined title of a period from the system-defined one (dependent on date)
 * @param {string} period - The system-defined title for a period ('1', '5', 'Break', etc.)
 * @returns {(string|undefined)} The user-defined title if storage is supported and there is one
 */
function getClassName(period) {
  //If the period isn't Lunch or Break, and the browser allows appStorage
  if (hasStorage) {
    //if it does, get the name of the period if it exists
    return localStorage.getItem(period)
      ? localStorage.getItem(period)
      : undefined;
  } else {
    return undefined;
  }
}

//Create original schedule
$(document).ready(() => {
  generateSchedule(defaultAllSchedules);
});

/**
 * Converts 00:00 to date object (dependent on date)
 * @param {string} timeString - The time in HH:SS format
 * @returns {Date} The parsed time in the current day at the given time
 */
function timeStringToDate(timeString) {
  //create a new date object for current time
  let output = newDebugDate();

  //create array of x:y [x, y]
  let numbers = timeString.split(":");

  //set the time of the date object to the numbers with curent date and 0 ms
  output.setHours(numbers[0], numbers[1], 0);
  return output;
}

/**
 * Find the next event (start/end of period/break)
 * @param {Object[]} timesList - Array of all the time events with timestamp
 * @param {number} timesList[].time - Unix timestamp of the event
 * @param {string} timesList[].name - System-defined name for the event
 * @returns Returns object with the next event's timestamp and name
 */
function findNext(timesList) {
  //create current date
  let curDate = newDebugDate();

  //for every event, check to see if it's passed
  for (let i = 0; i < timesList.length; i++) {
    //if the current time is before the event time, break the loop and return it
    if (timesList[i].time >= curDate.getTime()) {
      return timesList[i];
    }
  }

  //if all events have passed, return undefined
  return undefined;
}

//set the next event
// let nextTime = findNext(times);
let prevSec = 0;
let prevNext = 0;

/**
 * Render the timer till next event
 * @param {Object} nextEvent - Object containing the next event's info
 * @param {number} nextEvent.time - Unix timestamp of the event
 * @param {string} nextEvent.name - System-defined name for the event
 */
function renderTimer(times, dayNum) {
  if (dayNum != newDebugDate().getDay()) {
    generateSchedule(defaultAllSchedules);
  }

  nextTime = findNext(times);

  //Set current date
  let curDate = newDebugDate();

  //define timer element
  let timerDOM = document.getElementById("timer");

  //if there is an event coming up
  if (nextTime) {
    //check if the event is still ahead and not past
    let difference = nextTime.time - curDate.getTime();

    //Set text to set the timer to, parsed with the msToTime thing
    let text = msToTime(difference);
    if (document.visibilityState == "visible") {
      //Set timer object to the data returned

      timerDOM.innerHTML =
        text.minutes + ":" + text.seconds + "." + text.milliseconds;
      if (prevNext != nextTime) {
        $("#next").text(
          "Until " +
            nextTime.name +
            (getClassName(nextTime.name.slice(-1))
              ? ": " + getClassName(nextTime.name.slice(-1))
              : "")
        );
        prevNext = nextTime;
      }
    }

    if (prevSec != text.seconds) {
      //set the title to the time
      // if (document.visibilityState == "visible") {
      document.title = text.minutes + ":" + text.seconds;
      // } else {
      //   document.title = text.minutes + ":" + String(parseInt(text.seconds)-1);
      // }

      //set the prev seconds to the latest second
      prevSec = text.seconds;
    }
  } else {
    //if there is no event coming up, display text
    timerDOM.innerText = "School's Out!";
    document.title = "School's Out!";
  }
}

/**
 * Converts MS to Minutes, Seconds, and Milliseconds
 * @param {number} duration - The time in MS to convert to m, s, and ms
 * @returns Object containing the minutes, seconds, and ms
 */
function msToTime(duration) {
  //find the ms, seconds, and minutes
  var milliseconds = Math.floor(duration % 1000),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor(duration / (1000 * 60));
  
  //add 0 to beginning of numbers if it's only one digit
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  milliseconds =
    milliseconds < 100
      ? milliseconds < 10
        ? "00" + milliseconds
        : "0" + milliseconds
      : milliseconds;

  return {
    minutes: minutes,
    seconds: seconds,
    milliseconds: milliseconds,
  };
}

//show the naming menu to change names of periods
$("#shownaming").click(() => {
  $("#naming").stop();
  $("#naming").slideToggle();
});

//change period name on input
$(".pinput").on("input", function () {
  let $input = $(this);
  setClassName($input.attr("id")[1], $input.val());
});

/**
 * Change a class name
 * @param {string} period - The system-defined period name to change
 * @param {string} className - The user-defined name to change it to
 */
function setClassName(period, className) {
  //only changes if there is local storage enabled
  if (hasStorage) {

    //if there is an actual class name, set the name
    if (className && className != "") {
      localStorage.setItem(period, className);
      $(`tr[value=${period}] td:nth-child(1)`).text(period + ": " + className);
    } else { //if not, remove it and reset the schedule
      localStorage.removeItem(period);
      $(`tr[value=${period}] td:nth-child(1)`).text(period);
    }
  }
}
