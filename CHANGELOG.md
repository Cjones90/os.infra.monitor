# Changelog

## 0.14.0 -> 0.15.0  
* Add healthcheck, entrypoint, label, cmd to docker image  
* Add consul TTL health check as a dead mans switch (docker was leaving zombie containers when scaling the stack up/down or connection handling)  
* Register/Deregister unique service checks per docker container on clean bootup/shutdown  
* Implement serverState for status of server and/or ws connection for healthchecks  
* Change host "dev" port to allow listening on 2 ports for blue/green in future  
* Remove external api call for services  
* Add `/api/put/deregistercheck`  
* Upgrade `ws` from 3.0.0 to 5.0.0

### Breaking changes  
* Remove host mounted volumes for production  
* Remove extra_hosts  
* Turn off half-baked service launching feature for now (has a toggle)  
* Remove `/api/put/deregisterService`  
* Turn off `/api/get/repos` and `/api/post/launchservice` by default  
* Change `getLeader` ws call to `getConsulPort`  
* Change from port 4040 -> 4050. Firefox has a problem with 4045

### Bug Fixes  
* Use pm2-dev in development for server restarts  
* Graceful shutdown for ws connection  
* Setup proper retries and handlers for ws  
* Wait to send pm2 "ready" until server is listening (for pm2-runtime)  
* Remove stale option from Consul  

##### To be removed  
* Add proxy docker network temporarily  
