'use strict';

import React from 'react';
import DOM from 'react-dom';

import { api } from "os-npm-util";

require("../style/Adminbar.less")

export default class Adminbar extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            user: "",
            showLoginContainer: false,
            isLoggedIn: false
        }
    }

    componentDidMount() {
        api.get("/username", (res) => {
            if(!res.status) { return this.setState({ isLoggedIn: false }) }
            this.setState({ user: res.data, isLoggedIn: true })
        })
    }

    logout () {
        api.post("/logout", (res) => {
            if(!res.status) {
                return alert("Unable to logout at this time due to incorrect credentials or server error. "+
                "\n\nPlease try again later.")
            }
            location.reload()
        })

    }

    toggleLoginContainer () {
        let hostname = location.hostname.split(".").length === 3
            ? location.hostname.replace(/^[\w]+\./, "")
            : location.hostname

        location.href = location.hostname === "localhost"
            ? "http://localhost:4030/login"
            : `https://auth.${hostname}/login`
    }

    render () {

        let loginButton = !this.state.isLoggedIn
            ? <button onClick={this.toggleLoginContainer.bind(this)}>Login</button>
            : <button onClick={this.logout.bind(this)}>Logout</button>

        let loggedInAs = this.state.isLoggedIn
            ? <div id="loginText">Logged in as: {this.state.user}</div>
            : null

        return (
            <div id="component-adminbar" className="doNotHide">
                {loginButton}
                {loggedInAs}
            </div>
        )
    }
}
