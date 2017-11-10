"use strict";

const getCookie = (name) => {
    return document.cookie.split('; ').reduce((acc, v) => {
        const split = v.split('=')
        return split[0] === name ? decodeURIComponent(split[1]) : acc
    }, '')
}

const api = {

    get: function (type, opts, callback) {
        if(typeof(opts) === "function") { callback = opts; opts = {} }
        opts.type = type

        let request = {
            method: "GET",
            headers: {
                "Auth-Email": getCookie("Auth-Email"),
                "Auth-Key": getCookie("Auth-Key"),
            }
        }
        fetch(`${HOST}/api/get/${type}`, request)
        .then((r) => r.json())
        .then(callback)
        .catch((e) => console.log("E:", e))
    },

    post: function (type, opts, callback) {
        if(typeof(opts) === "function") { callback = opts; opts = {} }
        opts.type = type

        let request = {
            method: "POST",
            body: JSON.stringify(opts),
            headers: {
                "Auth-Email": getCookie("Auth-Email"),
                "Auth-Key": getCookie("Auth-Key"),
            }
        }
        fetch(`${HOST}/api/post/${type}`, request)
        .then((r) => r.json())
        .then(callback)
        .catch((e) => console.log("E:", e))
    },

    put: function (type, opts, callback) {
        if(typeof(opts) === "function") { callback = opts; opts = {} }
        opts.type = type
        
        let request = {
            method: "PUT",
            body: JSON.stringify(opts),
            headers: {
                "Auth-Email": getCookie("Auth-Email"),
                "Auth-Key": getCookie("Auth-Key"),
            }
        }
        fetch(`${HOST}/api/put/${type}`, request)
        .then((r) => r.json())
        .then(callback)
        .catch((e) => console.log("E:", e))
    },
}

module.exports = api
