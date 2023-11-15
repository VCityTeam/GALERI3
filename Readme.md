# Galeri3

Galeri3 is a web application made of a backend ([express](https://expressjs.com/) + [sqlite](https://www.sqlite.org/index.html)) and a front end based on the framework [ud-viz](https://github.com/VCityTeam/UD-Viz)

## Getting started

 * clone repo
  
    `git clone https://github.com/VCityTeam/GALERI3.git`

  * cd inside it

    `cd ./GALERI3`

  * install dependencies

    `npm install`

  * create a secret to generate user token

    `npm run create-token-secret`

  * create an admin user

    `node ./bin/createAdmin.js admin_name admin_password`

  *  edit [config](./packages//browser//public/config.json) 

  * run the application

    `npm run start`

  * go to http://localhost:8000/ and connect with the admin user you have just created