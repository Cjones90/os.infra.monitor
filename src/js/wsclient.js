"use strict";

let callbacks = {
    "message": [],
    "error": [],
    "open": [],
    "close": []
};

const getCookie = (name) => {
    return document.cookie.split('; ').reduce((acc, v) => {
        const split = v.split('=')
        return split[0] === name ? decodeURIComponent(split[1]) : acc
    }, '')
}

export default class WS {

    constructor() {
        this.defaultRetryTime = 5000
        this.retries = 0
        this.maxRetries = 15
        this.connecting = false;
        this.connect();
    }

    connect () {
        if(this.connecting) { return; }
        console.log("Connecting");
        this.connecting = true;
        this.ws = new WebSocket(WS_HOST)
        this.ws.addEventListener("close", this.handleWsClose.bind(this))
        this.ws.addEventListener("error", this.handleWsErr.bind(this))
        this.ws.addEventListener("message", this.handleWsMsg.bind(this))
        this.ws.addEventListener("open", () => {
            this.connecting = false;
            console.log("Connected");
            this.retries = 0;
        })
        this.reattachListeners()
    }

    handleWsMsg(msg) {
        let parsed = JSON.parse(msg.data);
        parsed.type === "ping" && window.ws.send({type: "pong"});
    }

    handleWsClose(evt) {
        console.log("Closed:", evt);
        this.connecting = false;
        if(this.retries < this.maxRetries) {
            console.log("Retrying connection " + (this.maxRetries - this.retries) + " more time(s)");
            setTimeout(this.connect.bind(this, true), (this.defaultRetryTime * ++this.retries))
        }
        else { console.log("Server appears down"); }
    }

    handleWsErr(err) {
        console.log("Err:", err);
        if(this.retries < this.maxRetries) {
            console.log("Retrying connection " + (this.maxRetries - this.retries) + " more time(s)");
            setTimeout(this.connect.bind(this, true), (this.defaultRetryTime * ++this.retries))
        }
        else { console.log("Server appears down"); }
    }

    reattachListeners () {
        Object.keys(callbacks).forEach((evt) => {
            callbacks[evt].forEach((fn, i) => {
                this.ws.addEventListener(evt, fn);
            })
        })
    }

    on (evt, fn) {
        callbacks[evt].push(fn)
        this.ws.addEventListener(evt, fn);
    }

    send (json) {
        json.headers = {
            "auth-email": getCookie("Auth-Email"),
            "auth-key": getCookie("Auth-Key"),
        }
        this.ws.send(JSON.stringify(json))
    }
}
