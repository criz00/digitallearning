/*
 * Amplitude tracking for a course built in the newer Adobe Captivate (12+),
 * hosted on GitHub Pages.
 */
(function () {
  var COURSE_NAME = 'Coducting performance reviews'; // change to your course title
  var DEBUG = true;              // set to false once everything works

  function track(name, props) {
    props = props || {};
    props.course = COURSE_NAME;
    if (DEBUG) console.log('[Amplitude]', name, props);
    if (window.amplitude && window.amplitude.track) {
      window.amplitude.track(name, props);
    }
  }

  function getData(e) {
    return (e && (e.Data || e.data)) || {};
  }

  function attach(emitter) {
    var startedAt = Date.now();
    var slideEnteredAt = Date.now();
    var completed = false;

    emitter.addEventListener('CPAPI_MOVIESTART', function (e) {
      if (DEBUG) console.log('[Captivate] MOVIESTART', e);
      track('Course Started');
    });

    emitter.addEventListener('CPAPI_SLIDEENTER', function (e) {
      if (DEBUG) console.log('[Captivate] SLIDEENTER', e);
      var d = getData(e);
      slideEnteredAt = Date.now();
      track('Slide Viewed', {
        slide_number: d.slideNumber != null ? d.slideNumber
          : (window.cpAPIInterface && window.cpAPIInterface.getCurrentSlideIndex
             ? window.cpAPIInterface.getCurrentSlideIndex() : null),
        slide_label: d.slideLabel || null
      });
    });

    emitter.addEventListener('CPAPI_SLIDEEXIT', function (e) {
      var d = getData(e);
      track('Slide Exited', {
        slide_number: d.slideNumber != null ? d.slideNumber : null,
        seconds_on_slide: Math.round((Date.now() - slideEnteredAt) / 1000)
      });
    });

    emitter.addEventListener('CPAPI_QUESTIONSUBMIT', function (e) {
      if (DEBUG) console.log('[Captivate] QUESTIONSUBMIT', e);
      var d = getData(e);
      track('Quiz Question Answered', {
        question_number: d.questionNumber != null ? d.questionNumber : null,
        interaction_id: d.interactionID || null,
        correct: d.questionAnsweredCorrectly != null ? !!d.questionAnsweredCorrectly : null,
        attempt: d.questionAttempts != null ? d.questionAttempts : null
      });
    });

    emitter.addEventListener('CPAPI_QUESTIONSKIP', function (e) {
      var d = getData(e);
      track('Quiz Question Skipped', {
        question_number: d.questionNumber != null ? d.questionNumber : null
      });
    });

    emitter.addEventListener('CPAPI_MOVIESTOP', function () {
      if (completed) return;
      completed = true;
      track('Course Completed', {
        minutes_in_course: Math.round((Date.now() - startedAt) / 60000)
      });
    });
  }

  // Captivate creates its event emitter after the course loads, so wait for it.
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var emitter = window.cpAPIEventEmitter ||
      (window.cpAPIInterface && window.cpAPIInterface.getEventEmitter
        ? window.cpAPIInterface.getEventEmitter() : null);
    if (emitter && emitter.addEventListener) {
      clearInterval(timer);
      if (DEBUG) console.log('[Amplitude] Connected to Captivate events');
      attach(emitter);
    } else if (tries > 120) { // give up after ~60 seconds
      clearInterval(timer);
      console.warn('[Amplitude] Could not find Captivate event emitter');
    }
  }, 500);
})();
