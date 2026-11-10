(function () {
  var COURSE_NAME = 'Conducting Performance Reviews';
  var DEBUG = true; // set to false once everything works

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
    var percentSeen = 0;

    function complete() {
      if (completed) return;
      completed = true;
      track('Course Completed', {
        minutes_in_course: Math.round((Date.now() - startedAt) / 60000)
      });
    }

    emitter.addEventListener('CPAPI_MOVIESTART', function () {
      track('Course Started');
    });

    emitter.addEventListener('CPAPI_SLIDEENTER', function (e) {
      var d = getData(e);
      slideEnteredAt = Date.now();
      if (d.percentageSlideSeen != null) percentSeen = Math.round(d.percentageSlideSeen);
      track('Slide Viewed', {
        slide_number: d.slideNumber != null ? d.slideNumber : null,
        percent_of_course_seen: percentSeen
      });
      if (percentSeen >= 100) complete();
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

    // Captivate can fire MOVIESTOP before the course starts,
    // so only count it once most of the course has been seen.
    emitter.addEventListener('CPAPI_MOVIESTOP', function () {
      if (percentSeen >= 90) complete();
    });
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var emitter = window.cpAPIEventEmitter;
    if (emitter && emitter.addEventListener) {
      clearInterval(timer);
      if (DEBUG) console.log('[Amplitude] Connected to Captivate events');
      attach(emitter);
    } else if (tries > 120) {
      clearInterval(timer);
      console.warn('[Amplitude] Could not find Captivate event emitter');
    }
  }, 500);
})();
