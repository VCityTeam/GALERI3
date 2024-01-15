FROM alpine:3.16

LABEL maintainer "VCityTeam"

# install packages
RUN apk add --no-cache nodejs
RUN node --version
RUN apk add --no-cache npm
RUN npm --version

# install GALERI3
COPY . /GALERI3
WORKDIR /GALERI3 
RUN npm install

# run GALERI3
CMD ["npm", "run", "start"]
EXPOSE 8000