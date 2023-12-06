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
ARG ADMIN=admin
ARG ADMIN_PWD=admin
RUN touch .env
RUN npm run create-token-secret
RUN node ./bin/createAdmin.js ${ADMIN} ${ADMIN_PWD}

# run GALERI3
CMD ["npm", "run", "start"]
EXPOSE 8000