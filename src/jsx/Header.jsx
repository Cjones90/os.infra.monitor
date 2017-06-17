"use strict";

const React = require('react');
const DOM = require('react-dom');

class Header extends React.Component{

    constructor(props) {
        super(props)
        this.state = {
            url: props.url,
            servers: []
        }
    }

    componentDidMount() {
        this.makeCall(`api/get/server/header`, {method: "GET"}, (res) => {
            let servers = res ? res.map((server) => {
                return {
                    name: server.name,
                    status: server.status,
                    link: `${server.defaultCon}`
                }
            }) : []
            this.setState({servers: servers})
        })
    }

    makeCall(path, opts, callback) {
        fetch(`${this.state.url}/${path}`, opts).then((r) => r.json()).then((data) => {
            callback(data)
        })
    }

    render() {
        let styles = {
            header: {
                height: "35px",
                textAlign: "center",
                background: "cadetblue",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center"
            },
            button: {
                border: "1px solid black",
                width: "12%",
                height: "28px",
                background: "white",
                color: "black",
                textDecoration: "none",
                margin: "0 10px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center"
            }
        }

        let servers = this.state.servers.map((server, ind) => {
            return (
                <a style={styles.button} key={server + ind} href={server.link} target="_blank">
                    {server.name}
                </a>
            )
        })

        return (
            <div id="component-header" style={styles.header}>
                {servers}
            </div>
        );
    }

}

module.exports = Header
