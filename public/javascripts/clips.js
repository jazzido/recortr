// Yeah, this code seriously sucks. But anyway, it is
// Copyright (C) 2008 Manuel Aristaran

var wfs; // waveform resizable
var wf; // waveform container

// preload image helper
var pl = function(imageURL) {
    (new Image()).src = imageURL;
};

// formats no. of seconds to mm:ss
var secsToTime = function(seconds) {
    var l0 = function(n) { if (n >= 0 && n < 10) n = '0' + n; return n; }
    return parseInt(seconds / 60) + ':' + l0(parseInt(seconds % 60));
};

var showError = function(m) {
	alert(m); return false;
};


// submits the upload form
var submitForm = function() {
    if (wf && wf.is(':visible')) {
	wf.slideUp('slow');
	wf.css('background-image', null);
    }
    $('#ajax-loader').show();
    $(this).parents('form').submit();
};


var setControlButtonIcon = function(icon) {
    var butimg = $('#waveform-selection button img');
    switch(icon) {
    case 'play': butimg.attr('src','/images/thumb_icon_play_rot_0.png'); break;
    case 'pause': butimg.attr('src','/images/thumb_icon_pause.png'); break;
    }
};



// called by the iframe when the upload is done
var uploadFinished = function(options) {

    var plotSampleRate = parseInt(options.samples_c / options.wave_duration);
    var samplesPerPixel = parseInt(options.samples_c / options.plot_width);

    if (wfs && wfs.data('draggable')) wfs.data('draggable').destroy();
    if (wfs && wfs.data('resizable')) wfs.data('resizable').destroy();
    wfs = null;
    
    $('#ajax-loader').hide();

    if (options.error) {
	showError(options.error);
	return -1;
    }

    pl(options.plot_url);


    wf = $('#waveform');
    wf.css('background-image', 'url(' + options.plot_url + ')');
    wf.css('padding-left', options.plot_padding + 'px');
    wf.css('padding-right', options.plot_padding + 'px');

    wf.slideDown('slow');

    var playProgressBar = $('#waveform-play-progress');

    var wfsb = $('#waveform-selection button');
    wfsb.unbind('click');


    wfsb.click(function(e) {
	this.blur();
	var ntrv = wfs.data('interval');
	var sid = options.clip_id + '-' + ntrv[0] + '-' + ntrv[1];
	var s;
	var clipURL = '/clip/' + options.clip_id + '?s=' + ntrv[0] + '&d=' + ntrv[1];
	if (!(s = soundManager.getSoundById(sid))) {
	    var s = soundManager.createSound({
		id: sid,
		url: clipURL,
		autoPlay: false,
		whileplaying: function(p, pd, wfd, eqd) {
		    playProgressBar.css('left', parseInt((this.position * wfs.width()) / this.durationEstimate));
		},
		onplay: function() {
		    playProgressBar.css('left', '-2px');
 		    playProgressBar.show();
 		    wfs.data('resizable').disable();
		    wfs.data('draggable').disable();
 		    setControlButtonIcon('pause'); 
 		    $('#download-link a').attr('href', clipURL);
 		    $('#download-link a').css('visibility', 'visible');
		},
		onresume: function() { 
		    wfs.data('resizable').disable(); 
		    wfs.data('draggable').disable();
		    setControlButtonIcon('pause'); 
		},
		onfinish: function() { 
		    wfs.data('resizable').enable(); 
		    wfs.data('draggable').enable();
		    setControlButtonIcon('play'); 
		},
		onpause: function() { 
		    wfs.data('resizable').enable(); 
		    wfs.data('draggable').enable(); 
		    setControlButtonIcon('play'); 
		}
	    });
	}

	if (s.playState != 1 || s.paused) { // not playing
	    s.play();
	}
	else { // playing
	    s.pause();
	}

    });

    wfs = $('#waveform-selection');

    sizeToInterval = function(regionStart, regionWidth) {
	return [regionStart*samplesPerPixel / plotSampleRate, 
		(regionWidth*samplesPerPixel) / plotSampleRate];
    };

    setInterval = function(lft, wth) {
	var ntrv = sizeToInterval(lft, wth);
	wfs.data('interval', ntrv);
	$('.ui-resizable-handle').css('visibility', 'visible');
	$('.ui-resizable-w').html(secsToTime(ntrv[0]));
	$('.ui-resizable-e').html(secsToTime(ntrv[0] + ntrv[1]));
    };

    wfs.resizable({ handles: 'e,w',
		    minWidth: 40,
		    maxWidth: parseInt((plotSampleRate * 30) / samplesPerPixel),
		    containment: $('#waveform'),
		    resize: function(e, ui) {
			$('#download-link a').css('visibility', 'hidden');
			playProgressBar.hide();
			setInterval(ui.position.left, ui.size.width);
		    },
		  });

    wfs.draggable({ axis: 'x',
		    containment: $('#waveform'),
		    drag: function(e, ui) {
			$('#download-link a').css('visibility', 'hidden');
			playProgressBar.hide();
			setInterval(ui.position.left, $(this).width());
		    }
    });

    wfs.css('left', 0);
    wfs.width(parseInt((plotSampleRate * 30) / samplesPerPixel));
    setInterval(0, wfs.width());

};

soundManager.url = '/swf/';
soundManager.waitForWindowLoad = true;
soundManager.debugMode = false;


soundManager.onload = function() {
};
   
$(document).ready(function() {
    $('input[@type=file]').change(submitForm);
    // preload some shit
    pl('/images/ajax-loader.gif');
    pl('/images/thumb_icon_pause.png');
});
