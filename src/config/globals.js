'use strict';

window.HOST = location.protocol+"//"+location.host;
// TODO: Temp until we can use wss to connect
window.WS_HOST = location.hostname === 'localhost' ? `ws://${location.host}`: `ws://${location.host}`;
window.DOMAIN = location.protocol+"//"+location.hostname
