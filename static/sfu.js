// Copyright (c) 2020 by Juliusz Chroboczek.

// This is not open source software.  Copy it, and I'll break into your
// house and tell your three year-old that Santa doesn't exist.

'use strict';

/** @type {string} */
let group;

/** @type {ServerConnection} */
let serverConnection;

/**
 * @typedef {Object} userpass
 * @property {string} username
 * @property {string} password
 */

/* Some browsers disable session storage when cookies are disabled,
   we fall back to a global variable. */
/**
 * @type {userpass}
 */
let fallbackUserPass = null;


/**
 * @param {string} username
 * @param {string} password
 */
function storeUserPass(username, password) {
    let userpass = {username: username, password: password};
    try {
        window.sessionStorage.setItem('userpass', JSON.stringify(userpass));
        fallbackUserPass = null;
    } catch(e) {
        console.warn("Couldn't store password:", e);
        fallbackUserPass = userpass;
    }
}

/**
 * Returns null if the user hasn't logged in yet.
 *
 * @returns {userpass}
 */
function getUserPass() {
    /** @type{userpass} */
    let userpass;
    try {
        let json = window.sessionStorage.getItem('userpass');
        userpass = JSON.parse(json);
    } catch(e) {
        console.warn("Couldn't retrieve password:", e);
        userpass = fallbackUserPass;
    }
    return userpass || null;
}

/**
 * Return null if the user hasn't logged in yet.
 *
 * @returns {string}
 */
function getUsername() {
    let userpass = getUserPass();
    if(!userpass)
        return null;
    return userpass.username;
}

/**
 * @typedef {Object} settings
 * @property {boolean} [localMute]
 * @property {string} [video]
 * @property {string} [audio]
 * @property {string} [send]
 * @property {string} [request]
 * @property {boolean} [activityDetection]
 * @property {boolean} [blackboardMode]
 */

/** @type{settings} */
let fallbackSettings = null;

/**
 * @param {settings} settings
 */
function storeSettings(settings) {
    try {
        window.sessionStorage.setItem('settings', JSON.stringify(settings));
        fallbackSettings = null;
    } catch(e) {
        console.warn("Couldn't store password:", e);
        fallbackSettings = settings;
    }
}

/**
 * This always returns a dictionary.
 *
 * @returns {settings}
 */
function getSettings() {
    /** @type {settings} */
    let settings;
    try {
        let json = window.sessionStorage.getItem('settings');
        settings = JSON.parse(json);
    } catch(e) {
        console.warn("Couldn't retrieve password:", e);
        settings = fallbackSettings;
    }
    return settings || {};
}

/**
 * @param {settings} settings
 */
function updateSettings(settings) {
    let s = getSettings();
    for(let key in settings)
        s[key] = settings[key];
    storeSettings(s);
}

/**
 * @param {string} key
 * @param {any} value
 */
function updateSetting(key, value) {
    let s = {};
    s[key] = value;
    updateSettings(s);
}

/**
 * @param {string} key
 */
function delSetting(key) {
    let s = getSettings();
    if(!(key in s))
        return;
    delete(s[key]);
    storeSettings(s)
}

/**
 * @param {string} id
 */
function getSelectElement(id) {
    let elt = document.getElementById(id);
    if(!elt || !(elt instanceof HTMLSelectElement))
        throw new Error(`Couldn't find ${id}`);
    return elt;
}

/**
 * @param {string} id
 */
function getInputElement(id) {
    let elt = document.getElementById(id);
    if(!elt || !(elt instanceof HTMLInputElement))
        throw new Error(`Couldn't find ${id}`);
    return elt;
}

/**
 * @param {string} id
 */
function getButtonElement(id) {
    let elt = document.getElementById(id);
    if(!elt || !(elt instanceof HTMLButtonElement))
        throw new Error(`Couldn't find ${id}`);
    return elt;
}

function reflectSettings() {
    let settings = getSettings();
    let store = false;

    setLocalMute(settings.localMute);

    let videoselect = getSelectElement('videoselect');
    if(!settings.video || !selectOptionAvailable(videoselect, settings.video)) {
        settings.video = selectOptionDefault(videoselect);
        store = true;
    }
    videoselect.value = settings.video;

    let audioselect = getSelectElement('audioselect');
    if(!settings.audio || !selectOptionAvailable(audioselect, settings.audio)) {
        settings.audio = selectOptionDefault(audioselect);
        store = true;
    }
    audioselect.value = settings.audio;

    if(settings.request)
        getSelectElement('requestselect').value = settings.request;
    else {
        settings.request = getSelectElement('requestselect').value;
        store = true;
    }

    if(settings.send)
        getSelectElement('sendselect').value = settings.send;
    else {
        settings.send = getSelectElement('sendselect').value;
        store = true;
    }

    getInputElement('activitybox').checked = settings.activityDetection;

    getInputElement('blackboardbox').checked = settings.blackboardMode;

    if(store)
        storeSettings(settings);

}

function showVideo() {
    let width = window.innerWidth;
    let video_container = document.getElementById('video-container');
    video_container.classList.remove('no-video');
    if (width <= 768)
        document.getElementById('collapse-video').style.display = "block";
}

/**
 * @param {boolean} [force]
 */
function hideVideo(force) {
    let mediadiv = document.getElementById('peers');
    if(mediadiv.childElementCount > 0 && !force)
        return;
    let video_container = document.getElementById('video-container');
    video_container.classList.add('no-video');
    let left = document.getElementById("left");
    if (left.style.display !== "none") {
        // hide all video buttons used to switch video on mobile layout
        closeVideoControls();
    }
}

function closeVideoControls() {
    // hide all video buttons used to switch video on mobile layout
    document.getElementById('switch-video').style.display = "";
    document.getElementById('collapse-video').style.display = "";
}

/**
  * @param{boolean} connected
  */
function setConnected(connected) {
    let userbox = document.getElementById('profile');
    let connectionbox = document.getElementById('login-container');
    if(connected) {
        resetUsers();
        clearChat();
        userbox.classList.remove('invisible');
        connectionbox.classList.add('invisible');
        displayUsername();
    } else {
        resetUsers();
        let userpass = getUserPass();
        getInputElement('username').value =
            userpass ? userpass.username : '';
        getInputElement('password').value =
            userpass ? userpass.password : '';
        getInputElement('presentoff').checked = true;
        userbox.classList.add('invisible');
        connectionbox.classList.remove('invisible');
        displayError("Disconnected!", "error");
        hideVideo();
        closeVideoControls();
    }
}

/** @this {ServerConnection} */
function gotConnected() {
    setConnected(true);
    let up = getUserPass();
    this.login(up.username, up.password);
    this.join(group);
    this.request(getSettings().request);
}

/**
 * @this {ServerConnection}
 * @param {number} code
 * @param {string} reason
 */
function gotClose(code, reason) {
    delUpMediaKind(null);
    setConnected(false);
    if(code != 1000) {
        console.warn('Socket close', code, reason);
    }
}

/**
 * @this {ServerConnection}
 * @param {Stream} c
 */
function gotDownStream(c) {
    c.onclose = function() {
        delMedia(c.id);
    };
    c.onerror = function(e) {
        console.error(e);
        displayError(e);
    }
    c.ondowntrack = function(track, transceiver, label, stream) {
        setMedia(c, false);
    }
    c.onlabel = function(label) {
        setLabel(c);
    }
    c.onstatus = function(status) {
        setMediaStatus(c);
    }
    c.onstats = gotDownStats;
    if(getSettings().activityDetection)
        c.setStatsInterval(activityDetectionInterval);
}

// Store current browser viewport height in css variable
function setViewportHeight() {
    document.documentElement.style.setProperty(
        '--vh', `${window.innerHeight/100}px`,
    );
    // Ajust video component size
    resizePeers();
}
setViewportHeight();

// On resize and orientation change, we update viewport height
addEventListener('resize', setViewportHeight);
addEventListener('orientationchange', setViewportHeight);

getButtonElement('presentbutton').onclick = async function(e) {
    e.preventDefault();
    let button = this;
    if(!(button instanceof HTMLButtonElement))
        throw new Error('Unexpected type for this.');
    // there's a potential race condition here: the user might click the
    // button a second time before the stream is set up and the button hidden.
    button.disabled = true;
    try {
        let id = findUpMedia('local');
        if(!id)
            await addLocalMedia();
    } finally {
        button.disabled = false;
    }
};

getButtonElement('unpresentbutton').onclick = function(e) {
    e.preventDefault();
    delUpMediaKind('local');
    resizePeers();
};

function changePresentation() {
    let id = findUpMedia('local');
    if(id) {
        addLocalMedia(id);
    }
}

/**
 * @param {string} id
 * @param {boolean} visible
 */
function setVisibility(id, visible) {
    let elt = document.getElementById(id);
    if(visible)
        elt.classList.remove('invisible');
    else
        elt.classList.add('invisible');
}

function setButtonsVisibility() {
    let permissions = serverConnection.permissions;
    let local = !!findUpMedia('local');
    let share = !!findUpMedia('screenshare');
    let video = !!findUpMedia('video');

    // don't allow multiple presentations
    setVisibility('presentbutton', permissions.present && !local);
    setVisibility('unpresentbutton', local);

    // allow multiple shared documents
    setVisibility('sharebutton', permissions.present &&
                  ('getDisplayMedia' in navigator.mediaDevices));
    setVisibility('unsharebutton', share);

    setVisibility('stopvideobutton', video);

    setVisibility('mediaoptions', permissions.present);
}

/**
 * @param {boolean} mute
 */
function setLocalMute(mute) {
    muteLocalTracks(mute);
    let button = document.getElementById('mutebutton');
    let icon = button.querySelector("span .fas");
    if(mute){
        icon.classList.add('fa-microphone-slash');
        icon.classList.remove('fa-microphone');
        button.classList.add('muted');
    } else {
        icon.classList.remove('fa-microphone-slash');
        icon.classList.add('fa-microphone');
        button.classList.remove('muted');
    }
}

getSelectElement('videoselect').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({video: this.value});
    changePresentation();
};

getSelectElement('audioselect').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({audio: this.value});
    changePresentation();
};

getInputElement('blackboardbox').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({blackboardMode: this.checked});
    changePresentation();
}

document.getElementById('mutebutton').onclick = function(e) {
    e.preventDefault();
    let localMute = getSettings().localMute;
    localMute = !localMute;
    updateSettings({localMute: localMute})
    setLocalMute(localMute);
}

document.getElementById('sharebutton').onclick = function(e) {
    e.preventDefault();
    addShareMedia();
};

document.getElementById('unsharebutton').onclick = function(e) {
    e.preventDefault();
    delUpMediaKind('screenshare');
    resizePeers();
}

document.getElementById('stopvideobutton').onclick = function(e) {
    e.preventDefault();
    delUpMediaKind('video');
    resizePeers();
}

/** @returns {number} */
function getMaxVideoThroughput() {
    let v = getSettings().send;
    switch(v) {
    case 'lowest':
        return 150000;
    case 'low':
        return 300000;
    case 'normal':
        return 700000;
    case 'unlimited':
        return null;
    default:
        console.error('Unknown video quality', v);
        return 700000;
    }
}

getSelectElement('sendselect').onchange = async function(e) {
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({send: this.value});
    let t = getMaxVideoThroughput();
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        await setMaxVideoThroughput(c, t);
    }
}

getSelectElement('requestselect').onchange = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLSelectElement))
        throw new Error('Unexpected type for this');
    updateSettings({request: this.value});
    serverConnection.request(this.value);
};

const activityDetectionInterval = 200;
const activityDetectionPeriod = 700;
const activityDetectionThreshold = 0.2;

getInputElement('activitybox').onchange = function(e) {
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    updateSettings({activityDetection: this.checked});
    for(let id in serverConnection.down) {
        let c = serverConnection.down[id];
        if(this.checked)
            c.setStatsInterval(activityDetectionInterval);
        else {
            c.setStatsInterval(0);
            setActive(c, false);
        }
    }
}

getInputElement('fileinput').onchange = function(e) {
    if(!(this instanceof HTMLInputElement))
        throw new Error('Unexpected type for this');
    let input = this;
    let files = input.files;
    for(let i = 0; i < files.length; i++)
        addFileMedia(files[i]);
    input.value = '';
    closeNav();
}

/**
 * @this {Stream}
 * @param {Object<string,any>} stats
 */
function gotUpStats(stats) {
    let c = this;

    let text = '';

    c.pc.getSenders().forEach(s => {
        let tid = s.track && s.track.id;
        let stats = tid && c.stats[tid];
        let rate = stats && stats['outbound-rtp'] && stats['outbound-rtp'].rate;
        if(typeof rate === 'number') {
            if(text)
                text = text + ' + ';
            text = text + Math.round(rate / 1000) + 'kbps';
        }
    });

    setLabel(c, text);
}

/**
 * @param {Stream} c
 * @param {boolean} value
 */
function setActive(c, value) {
    let peer = document.getElementById('peer-' + c.id);
    if(value)
        peer.classList.add('peer-active');
    else
        peer.classList.remove('peer-active');
}

/**
 * @this {Stream}
 * @param {Object<string,any>} stats
 */
function gotDownStats(stats) {
    if(!getInputElement('activitybox').checked)
        return;

    let c = this;

    let maxEnergy = 0;

    c.pc.getReceivers().forEach(r => {
        let tid = r.track && r.track.id;
        let s = tid && stats[tid];
        let energy = s && s['track'] && s['track'].audioEnergy;
        if(typeof energy === 'number')
            maxEnergy = Math.max(maxEnergy, energy);
    });

    // totalAudioEnergy is defined as the integral of the square of the
    // volume, so square the threshold.
    if(maxEnergy > activityDetectionThreshold * activityDetectionThreshold) {
        c.userdata.lastVoiceActivity = Date.now();
        setActive(c, true);
    } else {
        let last = c.userdata.lastVoiceActivity;
        if(!last || Date.now() - last > activityDetectionPeriod)
            setActive(c, false);
    }
}

/**
 * @param {HTMLSelectElement} select
 * @param {string} label
 * @param {string} [value]
 */
function addSelectOption(select, label, value) {
    if(!value)
        value = label;
    for(let i = 0; i < select.children.length; i++) {
        let child = select.children[i];
        if(!(child instanceof HTMLOptionElement)) {
            console.warn('Unexpected select child');
            continue;
        }
        if(child.value === value) {
            if(child.label !== label) {
                child.label = label;
            }
            return;
        }
    }

    let option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
}

/**
 * @param {HTMLSelectElement} select
 * @param {string} value
 */
function selectOptionAvailable(select, value) {
    let children = select.children;
    for(let i = 0; i < children.length; i++) {
        let child = select.children[i];
        if(!(child instanceof HTMLOptionElement)) {
            console.warn('Unexpected select child');
            continue;
        }
        if(child.value === value)
            return true;
    }
    return false;
}

/**
 * @param {HTMLSelectElement} select
 * @returns {string}
 */
function selectOptionDefault(select) {
    /* First non-empty option. */
    for(let i = 0; i < select.children.length; i++) {
        let child = select.children[i];
        if(!(child instanceof HTMLOptionElement)) {
            console.warn('Unexpected select child');
            continue;
        }
        if(child.value)
            return child.value;
    }
    /* The empty option is always available. */
    return '';
}

/* media names might not be available before we call getDisplayMedia.  So
   we call this twice, the second time to update the menu with user-readable
   labels. */
/** @type {boolean} */
let mediaChoicesDone = false;

/**
 * @param{boolean} done
 */
async function setMediaChoices(done) {
    if(mediaChoicesDone)
        return;

    let devices = [];
    try {
        devices = await navigator.mediaDevices.enumerateDevices();
    } catch(e) {
        console.error(e);
        return;
    }

    let cn = 1, mn = 1;

    devices.forEach(d => {
        let label = d.label;
        if(d.kind === 'videoinput') {
            if(!label)
                label = `Camera ${cn}`;
            addSelectOption(getSelectElement('videoselect'),
                            label, d.deviceId);
            cn++;
        } else if(d.kind === 'audioinput') {
            if(!label)
                label = `Microphone ${mn}`;
            addSelectOption(getSelectElement('audioselect'),
                            label, d.deviceId);
            mn++;
        }
    });

    mediaChoicesDone = done;
}


/**
 * @param {string} [id]
 */
function newUpStream(id) {
    let c = serverConnection.newUpStream(id);
    c.onstatus = function(status) {
        setMediaStatus(c);
    }
    c.onerror = function(e) {
        console.error(e);
        displayError(e);
        delUpMedia(c);
    }
    c.onabort = function() {
        delUpMedia(c);
    }
    c.onnegotiationcompleted = function() {
        setMaxVideoThroughput(c, getMaxVideoThroughput())
    }
    return c;
}

/**
 * @param {Stream} c
 * @param {number} [bps]
 */
async function setMaxVideoThroughput(c, bps) {
    let senders = c.pc.getSenders();
    for(let i = 0; i < senders.length; i++) {
        let s = senders[i];
        if(!s.track || s.track.kind !== 'video')
            continue;
        let p = s.getParameters();
        if(!p.encodings)
            p.encodings = [{}];
        p.encodings.forEach(e => {
            if(bps > 0)
                e.maxBitrate = bps;
            else
                delete e.maxBitrate;
        });
        try {
            await s.setParameters(p);
        } catch(e) {
            console.error(e);
        }
    }
}

/**
 * @param {string} [id]
 */
async function addLocalMedia(id) {
    if(!getUserPass())
        return;

    let settings = getSettings();

    let audio = settings.audio ? {deviceId: settings.audio} : false;
    let video = settings.video ? {deviceId: settings.video} : false;

    if(video) {
        if(settings.blackboardMode) {
            video.width = { min: 640, ideal: 1920 };
            video.height = { min: 400, ideal: 1080 };
        }
    }

    let old = id && serverConnection.up[id];

    if(!audio && !video) {
        if(old)
            delUpMedia(old);
        return;
    }

    if(old)
        stopUpMedia(old);

    let constraints = {audio: audio, video: video};
    /** @type {MediaStream} */
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch(e) {
        displayError(e);
        if(old)
            delUpMedia(old);
        return;
    }

    setMediaChoices(true);

    let c = newUpStream(id);

    c.kind = 'local';
    c.stream = stream;
    let mute = getSettings().localMute;
    stream.getTracks().forEach(t => {
        c.labels[t.id] = t.kind
        if(t.kind == 'audio') {
            if(mute)
                t.enabled = false;
        } else if(t.kind == 'video') {
            if(settings.blackboardMode) {
                /** @ts-ignore */
                t.contentHint = 'detail';
            }
        }
        c.pc.addTrack(t, stream);
    });

    c.onstats = gotUpStats;
    c.setStatsInterval(2000);
    await setMedia(c, true);
    setButtonsVisibility();
}

let safariWarningDone = false;

async function addShareMedia() {
    if(!getUserPass())
        return;

    /** @type {MediaStream} */
    let stream = null;
    try {
        if(!('getDisplayMedia' in navigator.mediaDevices))
            throw new Error('Your browser does not support screen sharing');
        /** @ts-ignore */
        stream = await navigator.mediaDevices.getDisplayMedia({video: true});
    } catch(e) {
        console.error(e);
        displayError(e);
        return;
    }

    if(!safariWarningDone) {
        let ua = navigator.userAgent.toLowerCase();
        if(ua.indexOf('safari') >= 0 && ua.indexOf('chrome') < 0) {
            displayWarning('Screen sharing under Safari is experimental.  ' +
                           'Please use a different browser if possible.');
        }
        safariWarningDone = true;
    }

    let c = newUpStream();
    c.kind = 'screenshare';
    c.stream = stream;
    stream.getTracks().forEach(t => {
        c.pc.addTrack(t, stream);
        t.onended = e => {
            delUpMedia(c);
        };
        c.labels[t.id] = 'screenshare';
    });
    c.onstats = gotUpStats;
    c.setStatsInterval(2000);
    await setMedia(c, true);
    setButtonsVisibility()
}

/**
 * @param {File} file
 */
async function addFileMedia(file) {
    if(!getUserPass())
        return;

    let url = URL.createObjectURL(file);
    let video = document.createElement('video');
    video.src = url;
    video.controls = true;
    /** @ts-ignore */
    let stream = video.captureStream();

    let c = newUpStream();
    c.kind = 'video';
    c.stream = stream;
    stream.onaddtrack = function(e) {
        let t = e.track;
        if(t.kind === 'audio') {
            let presenting = !!findUpMedia('local');
            let muted = getSettings().localMute;
            if(presenting && !muted) {
                setLocalMute(true);
                updateSettings({localMute: true});
                displayWarning('You have been muted');
            }
        }
        c.pc.addTrack(t, stream);
        c.labels[t.id] = t.kind;
        c.onstats = gotUpStats;
        c.setStatsInterval(2000);
    };
    stream.onremovetrack = function(e) {
        let t = e.track;
        delete(c.labels[t.id]);

        /** @type {RTCRtpSender} */
        let sender;
        c.pc.getSenders().forEach(s => {
            if(s.track === t)
                sender = s;
        });
        if(sender) {
            c.pc.removeTrack(sender)
        } else {
            console.warn('Removing unknown track');
        }

        if(Object.keys(c.labels).length === 0) {
            stream.onaddtrack = null;
            stream.onremovetrack == null;
            delUpMedia(c);
        }
    };
    setMedia(c, true, video);
    video.play();
    setButtonsVisibility()
}

/**
 * @param {Stream} c
 */
function stopUpMedia(c) {
    if(!c.stream)
        return;
    c.stream.getTracks().forEach(t => {
        try {
            t.stop();
        } catch(e) {
        }
    });
}

/**
 * @param {Stream} c
 */
function delUpMedia(c) {
    stopUpMedia(c);
    try {
        delMedia(c.id);
    } catch(e) {
        console.warn(e);
    }
    c.close(true);
    delete(serverConnection.up[c.id]);
    setButtonsVisibility()
}

/**
 * delUpMediaKind reoves all up media of the given kind.  If kind is
 * falseish, it removes all up media.
 * @param {string} kind
*/
function delUpMediaKind(kind) {
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        if(kind && c.kind != kind)
            continue
        c.close(true);
        delMedia(id);
        delete(serverConnection.up[id]);
    }

    setButtonsVisibility();
    hideVideo();
}

/**
 * @param {string} kind
 */
function findUpMedia(kind) {
    for(let id in serverConnection.up) {
        if(serverConnection.up[id].kind === kind)
            return id;
    }
    return null;
}

/**
 * @param {boolean} mute
 */
function muteLocalTracks(mute) {
    if(!serverConnection)
        return;
    for(let id in serverConnection.up) {
        let c = serverConnection.up[id];
        if(c.kind === 'local') {
            let stream = c.stream;
            stream.getTracks().forEach(t => {
                if(t.kind === 'audio') {
                    t.enabled = !mute;
                }
            });
        }
    }
}

/**
 * setMedia adds a new media element corresponding to stream c.
 *
 * @param {Stream} c
 * @param {boolean} isUp
 *     - indicates whether the stream goes in the up direction
 * @param {HTMLVideoElement} [video]
 *     - the video element to add.  If null, a new element with custom
 *       controls will be created.
 */
function setMedia(c, isUp, video) {
    let peersdiv = document.getElementById('peers');

    let div = document.getElementById('peer-' + c.id);
    if(!div) {
        div = document.createElement('div');
        div.id = 'peer-' + c.id;
        div.classList.add('peer');
        peersdiv.appendChild(div);
    }

    let media = /** @type {HTMLVideoElement} */
        (document.getElementById('media-' + c.id));
    if(media) {
        if(video) {
            throw new Error("Duplicate video");
        }
    } else {
        if(video) {
            media = video;
        } else {
            media = document.createElement('video');
            if(isUp)
                media.muted = true;
            media.srcObject = c.stream;
        }

        media.classList.add('media');
        media.autoplay = true;
        /** @ts-ignore */
        media.playsinline = true;
        media.id = 'media-' + c.id;
        div.appendChild(media);
        if(!video)
            addCustomControls(media, div, c);
    }

    let label = document.getElementById('label-' + c.id);
    if(!label) {
        label = document.createElement('div');
        label.id = 'label-' + c.id;
        label.classList.add('label');
        div.appendChild(label);
    }

    setLabel(c);
    setMediaStatus(c);

    showVideo();
    resizePeers();
}

/**
 * @param {Element} elt
 */
function cloneHTMLElement(elt) {
    if(!(elt instanceof HTMLElement))
        throw new Error('Unexpected element type');
    return /** @type{HTMLElement} */(elt.cloneNode(true));
}

/**
 * @param {HTMLVideoElement} media
 * @param {HTMLElement} container
 * @param {Stream} c
 */
function addCustomControls(media, container, c) {
    media.controls = false;
    let controls = document.getElementById('controls-' + c.id);
    if(controls) {
        console.warn('Attempted to add duplicate controls');
        return;
    }

    let template =
        document.getElementById('videocontrols-template').firstElementChild;
    controls = cloneHTMLElement(template);
    controls.id = 'controls-' + c.id;

    let volume = getVideoButton(controls, 'volume');
    if(c.kind === 'local') {
        volume.remove();
    } else {
        setVolumeButton(
            /** @type{HTMLElement} */(volume.firstElementChild),
            media.muted,
        );
    }

    container.appendChild(controls);
    registerControlHandlers(media, container);
}

/**
 * @param {HTMLElement} container
 * @param {string} name
 */
function getVideoButton(container, name) {
    return /** @type {HTMLElement} */(container.getElementsByClassName(name)[0]);
}

/**
 * @param {HTMLElement} button
 * @param {boolean} muted
 */
function setVolumeButton(button, muted) {
    if(!muted) {
        button.classList.remove("fa-volume-off");
        button.classList.add("fa-volume-up");
    } else {
        button.classList.remove("fa-volume-up");
        button.classList.add("fa-volume-off");
    }
}

/**
 * @param {HTMLVideoElement} media
 * @param {HTMLElement} container
 */
function registerControlHandlers(media, container) {
    let volume = getVideoButton(container, 'volume');
    if (volume) {
        volume.onclick = function(event) {
            event.preventDefault();
            media.muted = !media.muted;
            setVolumeButton(
                /** @type{HTMLElement} */(event.target),
                media.muted,
            );
        };
    }

    let pip = getVideoButton(container, 'pip');
    if(pip) {
        /** @ts-ignore */
        if(HTMLVideoElement.prototype.requestPictureInPicture) {
            pip.onclick = function(e) {
                e.preventDefault();
                /** @ts-ignore */
                if(media.requestPictureInPicture) {
                    /** @ts-ignore */
                    media.requestPictureInPicture();
                } else {
                    displayWarning('Picture in Picture not supported.');
                }
            };
        } else {
            pip.style.display = 'none';
        }
    }

    let fs = getVideoButton(container, 'fullscreen');
    if(fs) {
        if(HTMLVideoElement.prototype.requestFullscreen) {
            fs.onclick = function(e) {
                e.preventDefault();
                if(media.requestFullscreen) {
                    media.requestFullscreen();
                } else {
                    displayWarning('Full screen not supported!');
                }
            };
        } else {
            fs.style.display = 'none';
        }
    }
}

/**
 * @param {string} id
 */
function delMedia(id) {
    let mediadiv = document.getElementById('peers');
    let peer = document.getElementById('peer-' + id);
    if(!peer)
        throw new Error('Removing unknown media');

    let media = /** @type{HTMLVideoElement} */
        (document.getElementById('media-' + id));

    if(media.src) {
        URL.revokeObjectURL(media.src);
        media.src = null;
    }

    media.srcObject = null;
    mediadiv.removeChild(peer);

    resizePeers();
    hideVideo();
}

/**
 * @param {Stream} c
 */
function setMediaStatus(c) {
    let state = c && c.pc && c.pc.iceConnectionState;
    let good = state === 'connected' || state === 'completed';

    let media = document.getElementById('media-' + c.id);
    if(!media) {
        console.warn('Setting status of unknown media.');
        return;
    }
    if(good)
        media.classList.remove('media-failed');
    else
        media.classList.add('media-failed');
}


/**
 * @param {Stream} c
 * @param {string} [fallback]
 */
function setLabel(c, fallback) {
    let label = document.getElementById('label-' + c.id);
    if(!label)
        return;
    let l = c.label;
    if(l) {
        label.textContent = l;
        label.classList.remove('label-fallback');
    } else if(fallback) {
        label.textContent = fallback;
        label.classList.add('label-fallback');
    } else {
        label.textContent = '';
        label.classList.remove('label-fallback');
    }
}

function resizePeers() {
    // Window resize can call this method too early
    if (!serverConnection)
        return;
    let count =
        Object.keys(serverConnection.up).length +
        Object.keys(serverConnection.down).length;
    let peers = document.getElementById('peers');
    let columns = Math.ceil(Math.sqrt(count));
    if (!count)
        // No video, nothing to resize.
        return;
    let container = document.getElementById("video-container");
    // Peers div has total padding of 40px, we remove 40 on offsetHeight
    // Grid has row-gap of 5px
    let rows = Math.ceil(count / columns);
    let margins = (rows - 1) * 5 + 40;

    if (count <= 2 && container.offsetHeight > container.offsetWidth) {
        peers.style['grid-template-columns'] = "repeat(1, 1fr)";
        rows = count;
    } else {
        peers.style['grid-template-columns'] = `repeat(${columns}, 1fr)`;
    }
    if (count === 1)
        return;
    let max_video_height = (peers.offsetHeight - margins) / rows;
    let media_list = peers.querySelectorAll(".media");
    for(let i = 0; i < media_list.length; i++) {
        let media = media_list[i];
        if(!(media instanceof HTMLMediaElement)) {
            console.warn('Unexpected media');
            continue;
        }
        media.style['max-height'] = max_video_height + "px";
    }
}

/** @type{Object<string,string>} */
let users = {};

/**
 * Lexicographic order, with case differences secondary.
 * @param{string} a
 * @param{string} b
 */
function stringCompare(a, b) {
    let la = a.toLowerCase()
    let lb = b.toLowerCase()
    if(la < lb)
        return -1;
    else if(la > lb)
        return +1;
    else if(a < b)
        return -1;
    else if(a > b)
        return +1;
    return 0
}

/**
 * @param {string} id
 * @param {string} name
 */
function addUser(id, name) {
    if(!name)
        name = null;
    if(id in users)
        throw new Error('Duplicate user id');
    users[id] = name;

    let div = document.getElementById('users');
    let user = document.createElement('div');
    user.id = 'user-' + id;
    user.classList.add("user-p");
    user.textContent = name ? name : '(anon)';

    if(name) {
        let us = div.children;
        for(let i = 0; i < us.length; i++) {
            let child = us[i];
            let childname = users[child.id.slice('user-'.length)] || null;
            if(!childname || stringCompare(childname, name) > 0) {
                div.insertBefore(user, child);
                return;
            }
        }
    }
    div.appendChild(user);
}

/**
 * @param {string} id
 * @param {string} name
 */
function delUser(id, name) {
    if(!name)
        name = null;
    if(!(id in users))
        throw new Error('Unknown user id');
    if(users[id] !== name)
        throw new Error('Inconsistent user name');
    delete(users[id]);
    let div = document.getElementById('users');
    let user = document.getElementById('user-' + id);
    div.removeChild(user);
}

function resetUsers() {
    for(let id in users)
        delUser(id, users[id]);
}

/**
 * @param {string} id
 * @param {string} kind
 * @param {string} name
 */
function gotUser(id, kind, name) {
    switch(kind) {
    case 'add':
        addUser(id, name);
        break;
    case 'delete':
        delUser(id, name);
        break;
    default:
        console.warn('Unknown user kind', kind);
        break;
    }
}

function displayUsername() {
    let userpass = getUserPass();
    let text = '';
    if(userpass && userpass.username)
        document.getElementById('userspan').textContent = userpass.username;
    if(serverConnection.permissions.op && serverConnection.permissions.present)
        text = '(op, presenter)';
    else if(serverConnection.permissions.op)
        text = 'operator';
    else if(serverConnection.permissions.present)
        text = 'presenter';
    document.getElementById('permspan').textContent = text;
}

/**
 * @param {Object<string,boolean>} perms
 */
function gotPermissions(perms) {
    displayUsername();
    setButtonsVisibility();
    if(serverConnection.permissions.present)
        displayMessage("Press Present to enable your camera or microphone");
}

const urlRegexp = /https?:\/\/[-a-zA-Z0-9@:%/._\\+~#&()=?]+[-a-zA-Z0-9@:%/_\\+~#&()=]/g;

/**
 * @param {string} line
 * @returns {(Text|HTMLElement)[]}
 */
function formatLine(line) {
    let r = new RegExp(urlRegexp);
    let result = [];
    let pos = 0;
    while(true) {
        let m = r.exec(line);
        if(!m)
            break;
        result.push(document.createTextNode(line.slice(pos, m.index)));
        let a = document.createElement('a');
        a.href = m[0];
        a.textContent = m[0];
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        result.push(a);
        pos = m.index + m[0].length;
    }
    result.push(document.createTextNode(line.slice(pos)));
    return result;
}

/**
 * @param {string[]} lines
 * @returns {HTMLElement}
 */
function formatLines(lines) {
    let elts = [];
    if(lines.length > 0)
        elts = formatLine(lines[0]);
    for(let i = 1; i < lines.length; i++) {
        elts.push(document.createElement('br'));
        elts = elts.concat(formatLine(lines[i]));
    }
    let elt = document.createElement('p');
    elts.forEach(e => elt.appendChild(e));
    return elt;
}

/**
 * @param {number} time
 * @returns {string}
 */
function formatTime(time) {
    let delta = Date.now() - time;
    let date = new Date(time);
    let m = date.getMinutes();
    if(delta > -30000)
        return date.getHours() + ':' + ((m < 10) ? '0' : '') + m;
    return date.toLocaleString();
}

/**
 * @typedef {Object} lastMessage
 * @property {string} [nick]
 * @property {string} [peerId]
 * @property {string} [dest]
 */

/** @type {lastMessage} */
let lastMessage = {};

/**
 * @param {string} peerId
 * @param {string} nick
 * @param {number} time
 * @param {string} kind
 * @param {string} message
 */
function addToChatbox(peerId, dest, nick, time, priviledged, kind, message) {
    let userpass = getUserPass();
    let row = document.createElement('div');
    row.classList.add('message-row');
    let container = document.createElement('div');
    container.classList.add('message');
    row.appendChild(container);
    let footer = document.createElement('p');
    footer.classList.add('message-footer');
    if(!peerId)
        container.classList.add('message-system');
    if(userpass.username === nick)
        container.classList.add('message-sender');
    if(dest)
        container.classList.add('message-private');

    if(kind !== 'me') {
        let p = formatLines(message.split('\n'));
        if(lastMessage.nick !== (nick || null) ||
           lastMessage.peerId !== peerId ||
           lastMessage.dest !== (dest || null)) {
            let header = document.createElement('p');
            let user = document.createElement('span');
            user.textContent = dest ?
                `${nick||'(anon)'} \u2192 ${users[dest]||'(anon)'}` :
                (nick || '(anon)');
            user.classList.add('message-user');
            header.appendChild(user);
            header.classList.add('message-header');
            container.appendChild(header);
            if(time) {
                let tm = document.createElement('span');
                tm.textContent = formatTime(time);
                tm.classList.add('message-time');
                header.appendChild(tm);
            }
        }
        p.classList.add('message-content');
        container.appendChild(p);
        lastMessage.nick = (nick || null);
        lastMessage.peerId = peerId;
        lastMessage.dest = (dest || null);
        container.appendChild(footer);
    } else {
        let asterisk = document.createElement('span');
        asterisk.textContent = '*';
        asterisk.classList.add('message-me-asterisk');
        let user = document.createElement('span');
        user.textContent = nick || '(anon)';
        user.classList.add('message-me-user');
        let content = document.createElement('span');
        formatLine(message).forEach(elt => {
            content.appendChild(elt);
        });
        content.classList.add('message-me-content');
        container.appendChild(asterisk);
        container.appendChild(user);
        container.appendChild(content);
        container.classList.add('message-me');
        lastMessage = {};
    }

    let box = document.getElementById('box');
    box.appendChild(row);
    if(box.scrollHeight > box.clientHeight) {
        box.scrollTop = box.scrollHeight - box.clientHeight;
    }

    return message;
}

function clearChat() {
    lastMessage = {};
    document.getElementById('box').textContent = '';
}

/**
 * A command known to the command-line parser.
 *
 * @typedef {Object} command
 * @property {string} [parameters]
 *     - A user-readable list of parameters.
 * @property {string} [description]
 *     - A user-readable description, null if undocumented.
 * @property {() => string} [predicate]
 *     - Returns null if the command is available.
 * @property {(c: string, r: string) => void} f
 */

/**
 * The set of commands known to the command-line parser.
 *
 * @type {Object.<string,command>}
 */
let commands = {}

function operatorPredicate() {
    if(serverConnection.permissions.op)
        return null;
    return 'You are not an operator';
}

function recordingPredicate() {
    if(serverConnection.permissions.record)
        return null;
    return 'You are not allowed to record';
}

commands.help = {
    description: 'display this help',
    f: (c, r) => {
        /** @type {string[]} */
        let cs = [];
        for(let cmd in commands) {
            let c = commands[cmd];
            if(!c.description)
                continue;
            if(c.predicate && c.predicate())
                continue;
            cs.push(`/${cmd}${c.parameters?' ' + c.parameters:''}: ${c.description}`);
        }
        cs.sort();
        let s = '';
        for(let i = 0; i < cs.length; i++)
            s = s + cs[i] + '\n';
        addToChatbox(null, null, null, Date.now(), false, null, s);
    }
};

commands.me = {
    f: (c, r) => {
        // handled as a special case
        throw new Error("this shouldn't happen");
    }
};

commands.set = {
    f: (c, r) => {
        if(!r) {
            let settings = getSettings();
            let s = "";
            for(let key in settings)
                s = s + `${key}: ${JSON.stringify(settings[key])}\n`;
            addToChatbox(null, null, null, Date.now(), false, null, s);
            return;
        }
        let p = parseCommand(r);
        let value;
        if(p[1]) {
            value = JSON.parse(p[1])
        } else {
            value = true;
        }
        updateSetting(p[0], value);
        reflectSettings();
    }
};

commands.unset = {
    f: (c, r) => {
        delSetting(r.trim());
        return;
    }
};

commands.leave = {
    description: "leave group",
    f: (c, r) => {
        serverConnection.close();
    }
};

commands.clear = {
    predicate: operatorPredicate,
    description: 'clear the chat history',
    f: (c, r) => {
        serverConnection.groupAction('clearchat');
    }
};

commands.lock = {
    predicate: operatorPredicate,
    description: 'lock this group',
    parameters: '[message]',
    f: (c, r) => {
        serverConnection.groupAction('lock', r);
    }
};

commands.unlock = {
    predicate: operatorPredicate,
    description: 'unlock this group, revert the effect of /lock',
    f: (c, r) => {
        serverConnection.groupAction('unlock');
    }
};

commands.record = {
    predicate: recordingPredicate,
    description: 'start recording',
    f: (c, r) => {
        serverConnection.groupAction('record');
    }
};

commands.unrecord = {
    predicate: recordingPredicate,
    description: 'stop recording',
    f: (c, r) => {
        serverConnection.groupAction('unrecord');
    }
};

/**
 * parseCommand splits a string into two space-separated parts.  The first
 * part may be quoted and may include backslash escapes.
 *
 * @param {string} line
 * @returns {string[]}
 */
function parseCommand(line) {
    let i = 0;
    while(i < line.length && line[i] === ' ')
        i++;
    let start = ' ';
    if(i < line.length && line[i] === '"' || line[i] === "'") {
        start = line[i];
        i++;
    }
    let first = "";
    while(i < line.length) {
        if(line[i] === start) {
            if(start !== ' ')
                i++;
            break;
        }
        if(line[i] === '\\' && i < line.length - 1)
            i++;
        first = first + line[i];
        i++;
    }

    while(i < line.length && line[i] === ' ')
        i++;
    return [first, line.slice(i)];
}

/**
 * @param {string} user
 */
function findUserId(user) {
    if(user in users)
        return user;

    for(let id in users) {
        if(users[id] === user)
            return id;
    }
    return null;
}

commands.msg = {
    parameters: 'user message',
    description: 'send a private message',
    f: (c, r) => {
        let p = parseCommand(r);
        if(!p[0])
            throw new Error('/msg requires parameters');
        let id = findUserId(p[0]);
        if(!id)
            throw new Error(`Unknown user ${p[0]}`);
        let username = getUsername();
        serverConnection.chat(username, '', id, p[1]);
        addToChatbox(serverConnection.id, id, username,
                     Date.now(), false, '', p[1]);
    }
};

/**
   @param {string} c
   @param {string} r
*/
function userCommand(c, r) {
    let p = parseCommand(r);
    if(!p[0])
        throw new Error(`/${c} requires parameters`);
    let id = findUserId(p[0]);
    if(!id)
        throw new Error(`Unknown user ${p[0]}`);
    serverConnection.userAction(c, id, p[1]);
}


commands.kick = {
    parameters: 'user [message]',
    description: 'kick out a user',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.op = {
    parameters: 'user',
    description: 'give operator status',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.unop = {
    parameters: 'user',
    description: 'revoke operator status',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.present = {
    parameters: 'user',
    description: 'give user the right to present',
    predicate: operatorPredicate,
    f: userCommand,
};

commands.unpresent = {
    parameters: 'user',
    description: 'revoke the right to present',
    predicate: operatorPredicate,
    f: userCommand,
};

function handleInput() {
    let input = /** @type {HTMLTextAreaElement} */
        (document.getElementById('input'));
    let data = input.value;
    input.value = '';

    let message, me;

    if(data === '')
        return;

    if(data[0] === '/') {
        if(data.length > 1 && data[1] === '/') {
            message = data.slice(1);
            me = false;
        } else {
            let cmd, rest;
            let space = data.indexOf(' ');
            if(space < 0) {
                cmd = data.slice(1);
                rest = '';
            } else {
                cmd = data.slice(1, space);
                rest = data.slice(space + 1);
            }

            if(cmd === 'me') {
                message = rest;
                me = true;
            } else {
                let c = commands[cmd];
                if(!c) {
                    displayError(`Uknown command /${cmd}, type /help for help`);
                    return;
                }
                if(c.predicate) {
                    let s = c.predicate();
                    if(s) {
                        displayError(s);
                        return;
                    }
                }
                try {
                    c.f(cmd, rest);
                } catch(e) {
                    displayError(e);
                }
                return;
            }
        }
    } else {
        message = data;
        me = false;
    }

    if(!serverConnection || !serverConnection.socket) {
        displayError("Not connected.");
        return;
    }

    let username = getUsername();
    try {
        serverConnection.chat(username, me ? 'me' : '', '', message);
    } catch(e) {
        console.error(e);
        displayError(e);
    }
}

document.getElementById('inputform').onsubmit = function(e) {
    e.preventDefault();
    handleInput();
};

document.getElementById('input').onkeypress = function(e) {
    if(e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        handleInput();
    }
};

function chatResizer(e) {
    e.preventDefault();
    let full_width = document.getElementById("mainrow").offsetWidth;
    let left = document.getElementById("left");
    let right = document.getElementById("right");

    let start_x = e.clientX;
    let start_width = left.offsetWidth;

    function start_drag(e) {
        let left_width = (start_width + e.clientX - start_x) * 100 / full_width;
        // set min chat width to 300px
        let min_left_width = 300 * 100 / full_width;
        if (left_width < min_left_width) {
          return;
        }
        left.style.flex = left_width.toString();
        right.style.flex = (100 - left_width).toString();
    }
    function stop_drag(e) {
        document.documentElement.removeEventListener(
            'mousemove', start_drag, false,
        );
        document.documentElement.removeEventListener(
            'mouseup', stop_drag, false,
        );
    }

    document.documentElement.addEventListener(
        'mousemove', start_drag, false,
    );
    document.documentElement.addEventListener(
        'mouseup', stop_drag, false,
    );
}

document.getElementById('resizer').addEventListener('mousedown', chatResizer, false);

/**
 * @param {unknown} message
 * @param {string} [level]
 */
function displayError(message, level) {
    if(!level)
        level = "error";

    var background = 'linear-gradient(to right, #e20a0a, #df2d2d)';
    var position = 'center';
    var gravity = 'top';

    switch(level) {
    case "info":
        background = 'linear-gradient(to right, #529518, #96c93d)';
        position = 'right';
        gravity = 'bottom';
        break;
    case "warning":
        background = "linear-gradient(to right, #edd800, #c9c200)";
        break;
    }

    /** @ts-ignore */
    Toastify({
        text: message,
        duration: 4000,
        close: true,
        position: position,
        gravity: gravity,
        backgroundColor: background,
        className: level,
    }).showToast();
}

/**
 * @param {unknown} message
 */
function displayWarning(message) {
    return displayError(message, "warning");
}

/**
 * @param {unknown} message
 */
function displayMessage(message) {
    return displayError(message, "info");
}

let connecting = false;

document.getElementById('userform').onsubmit = async function(e) {
    e.preventDefault();
    if(connecting)
        return;
    connecting = true;
    try {
        let username = getInputElement('username').value.trim();
        let password = getInputElement('password').value;
        storeUserPass(username, password);
        serverConnect();
    } finally {
        connecting = false;
    }

    let presentboth = getInputElement('presentboth').checked;
    if(presentboth) {
        let button = getButtonElement('presentbutton');
        button.disabled = true;
        try {
            let id = findUpMedia('local');
            if(!id)
                await addLocalMedia();
        } finally {
            button.disabled = false;
        }
    }
};

document.getElementById('disconnectbutton').onclick = function(e) {
    serverConnection.close();
    closeNav();
};

function openNav() {
    document.getElementById("sidebarnav").style.width = "250px";
}

function closeNav() {
    document.getElementById("sidebarnav").style.width = "0";
}

document.getElementById('sidebarCollapse').onclick = function(e) {
    document.getElementById("left-sidebar").classList.toggle("active");
    document.getElementById("mainrow").classList.toggle("full-width-active");
};

document.getElementById('openside').onclick = function(e) {
      e.preventDefault();
      let sidewidth = document.getElementById("sidebarnav").style.width;
      if (sidewidth !== "0px" && sidewidth !== "") {
          closeNav();
          return;
      } else {
          openNav();
      }
};


document.getElementById('clodeside').onclick = function(e) {
    e.preventDefault();
    closeNav();
};

document.getElementById('collapse-video').onclick = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLElement))
        throw new Error('Unexpected type for this');
    let width = window.innerWidth;
    let left = document.getElementById("left");
    if (left.style.display === "" || left.style.display === "none") {
      //left chat is hidden, we show the chat and hide collapse button
      left.style.display = "block";
      this.style.display = "";
    }
    if (width <= 768) {
      // fixed div for small screen
      this.style.display = "";
      hideVideo(true);
      document.getElementById('switch-video').style.display = "block";
    }
};

document.getElementById('switch-video').onclick = function(e) {
    e.preventDefault();
    if(!(this instanceof HTMLElement))
        throw new Error('Unexpected type for this');
    showVideo();
    this.style.display = "";
    document.getElementById('collapse-video').style.display = "block";
};

document.getElementById('close-chat').onclick = function(e) {
  e.preventDefault();
  let left = document.getElementById("left");
  left.style.display = "none";
  document.getElementById('collapse-video').style.display = "block";
};

async function serverConnect() {
    if(serverConnection && serverConnection.socket)
        serverConnection.close();
    serverConnection = new ServerConnection();
    serverConnection.onconnected = gotConnected;
    serverConnection.onclose = gotClose;
    serverConnection.ondownstream = gotDownStream;
    serverConnection.onuser = gotUser;
    serverConnection.onpermissions = gotPermissions;
    serverConnection.onchat = addToChatbox;
    serverConnection.onclearchat = clearChat;
    serverConnection.onusermessage = function(id, dest, username, time, priviledged, kind, message) {
        let from = id ? (username || 'Anonymous') : 'The Server';
        switch(kind) {
        case 'error':
        case 'warning':
        case 'info':
            if(priviledged)
                displayError(`${from} said: ${message}`, kind);
            else
                console.error(`Got unpriviledged message of kind ${kind}`);
            break;
        default:
            console.warn(`Got unknown user message ${kind}`);
            break;
        }
    };
    let url = `ws${location.protocol === 'https:' ? 's' : ''}://${location.host}/ws`;
    try {
        await serverConnection.connect(url);
    } catch(e) {
        console.error(e);
        displayError(e.message ? e.message : "Couldn't connect to " + url);
    }
}

function start() {
    group = decodeURIComponent(location.pathname.replace(/^\/[a-z]*\//, ''));
    let title = group.charAt(0).toUpperCase() + group.slice(1);
    if(group !== '') {
        document.title = title;
        document.getElementById('title').textContent = title;
    }

    setMediaChoices(false).then(e => reflectSettings());

    document.getElementById("login-container").classList.remove('invisible');
}

start();
