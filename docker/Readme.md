# Docker

## Building

### Building without cloning
```bash
docker build -t vcity/galeri3 https://github.com/VCityTeam/Galeri3.git -f docker/Dockerfile
```

### Building after cloning

From the root folder of the project
```bash
docker build -t vcity/galeri3 -f docker/Dockerfile .
```

## Running

To launch the server
```bash
docker run vcity/galeri3:latest
```

## Configuring the app

Once the container is started, you can configure it by executing some commands
inside the container, this has to be done only once.

To attach the running container interactively you can do 
```bash
docker exec -it SHA_OF_CONTAINER sh
```

Once you are in the container just follow [this](../Readme.md#configuring-the-app).