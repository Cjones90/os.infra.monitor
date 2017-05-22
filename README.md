
# Download Docker **[here](https://www.docker.com/)**  

Dev & Production system require:  
- [Docker](https://www.docker.com/) (Engine & Compose) (v2+)   

Run:  
`docker-compose up [-d]`  
Use `-d` if you want to run it detached.

Check `HOST` under `HOST:CONTAINER` in `docker-compose.yml` for port  

## Development  
Edit `docker-compose.yml` to suit your needs  
Run `docker-compose up [-d]`  
Run `docker exec CONTAINER_NAME npm run watch`  
