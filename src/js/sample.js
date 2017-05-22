module.exports = {
    "name": "Root",
    "children": [
    {
        "name": "DataCenter1",
        "children": [
            {
                "name": "Server1 - AppSwarm1",
                "children": [
                    {
                        "name": "Swarm",
                        "children": [
                            { "name": "NH-Interface", "size":"1" },
                            { "name": "RER", "size":"1" },
                            { "name": "Dropbox", "size":"1" },
                            { "name": "Feedback", "size":"1" },
                            { "name": "NH-Interface", "size":"1" },
                            { "name": "RER", "size":"1" },
                            { "name": "Dropbox", "size":"1" },
                            { "name": "Feedback", "size":"1" }
                        ]
                    },
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "Redis", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" }
                ]
            },
            {
                "name": "Server2 - AppSwarm2",
                "children": [
                    {
                        "name": "Swarm",
                        "children": [
                            { "name": "NH-Interface", "size":"1" },
                            { "name": "RER", "size":"1" },
                            { "name": "Dropbox", "size":"1" },
                            { "name": "Feedback", "size":"1" }
                        ]
                    },
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "Redis", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" }
                ]
            },
            {
                "name": "Server3 - DB1",
                "children": [
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" },
                    { "name": "MongoDB", "size":"1" },
                ]
            },
            {
                "name": "Server4 - DB2",
                "children": [
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" },
                    { "name": "Postgres", "size":"1" },
                ]
            },
            {
                "name": "Server5 - Manager1",
                "children": [
                    { "name": "ConsulServer", "size":"1" },
                    { "name": "ChefServer", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" },
                    { "name": "SwarmManager", "size":"1" },
                ]
            },
            {
                "name": "Server6 - Proxy1",
                "children": [
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "HAProxy/DockerProxy", "size":"1" }
                ]
            }
        ]
    },
    {
        "name": "DataCenter2",
        "children": [
            {
                "name": "Server1 - FaaS1",
                "children": [
                    {
                        "name": "RER",
                        "children": [
                            { "name": "auth", "size":"1" },
                            { "name": "err-handle", "size":"1" },
                            { "name": "post", "size":"1" },
                            { "name": "get", "size":"1" }
                        ]
                    },
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "Redis", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" }
                ]
            },
            {
                "name": "Server2 - FaaS2",
                "children": [
                    {
                        "name": "RER",
                        "children": [
                            { "name": "auth", "size":"1" },
                            { "name": "err-handle", "size":"1" },
                            { "name": "post", "size":"1" },
                            { "name": "get", "size":"1" }
                        ]
                    },
                    {
                        "name": "NH-Interface",
                        "children": [
                            { "name": "auth", "size":"1" },
                            { "name": "err-handle", "size":"1" },
                            { "name": "post", "size":"1" },
                            { "name": "get", "size":"1" }
                        ]
                    },
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "Redis", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" }
                ]
            },
            {
                "name": "Server3 - AppSwarm1",
                "children": [
                    {
                        "name": "Swarm",
                        "children": [
                            { "name": "NH-Interface", "size":"1" },
                            { "name": "RER", "size":"1" },
                            { "name": "Dropbox", "size":"1" },
                            { "name": "Feedback", "size":"1" }
                        ]
                    },
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "Redis", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" }
                ]
            },
            {
                "name": "Server4 - DB1",
                "children": [
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" },
                    { "name": "MongoDB", "size":"1" },
                ]
            },
            {
                "name": "Server5 - Manage1",
                "children": [
                    { "name": "ConsulServer", "size":"1" },
                    { "name": "ChefServer", "size":"1" },
                    { "name": "RabbitMQ", "size":"1" },
                    { "name": "SwarmManager", "size":"1" },
                ]
            },
            {
                "name": "Server6 - Proxy1",
                "children": [
                    {
                        "name": "Proxy",
                        "children": [
                            { "name": "http", "size":"1" },
                            { "name": "https", "size":"1" },
                            { "name": "ws", "size":"1" }
                        ]
                    },
                    { "name": "ConsulClient", "size":"1" },
                    { "name": "ChefClient", "size":"1" },
                    { "name": "HAProxy/DockerProxy", "size":"1" }
                ]
            }
        ]
    }]
}
