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
docker run --rm  vcity/galeri3:latest
```
