# Galeri3

Galeri3 is a web application made of a backend ([express](https://expressjs.com/) + [sqlite](https://www.sqlite.org/index.html)) and a front end based on the framework [ud-viz](https://github.com/VCityTeam/UD-Viz)

## Getting started

 * clone repo
  
    `git clone https://github.com/VCityTeam/GALERI3.git`

  * navigate inside it

    `cd ./GALERI3`

  * install dependencies

    `npm install`

  * run the application

    `npm run build-start`

  * go to http://localhost:8000/.

  
## Configuring the app

Some of the below is mandatory to be able to use the app.

### SIG configuration 

You can customize [this config](./public/config.json) file
according to your need. 

#### object of interest 

The object of interest has to be a point cloud, 
in the config example it is served by an external server.
If you want the app to serve your data you can either choose to protect them 
by adding them in folder dedicassed for this purpose called *private_assets* at 
the root directory or you can put them in the *public* directory, in this case,
even not registered user can access them.

### User management 

#### Creation of the token for signing JWT

To sign the JWT, you need a secret, 
as an environnement variable *TOKEN_SECRET*. 

You can either create it in the .env file at the root of the app 

```bash
npm run create-token-secret
```

or use the following

```bash
export TOKEN_SECRET=MY_TOKEN_SECRET
```

#### Creation of the admin account

The user database is *database/user.sqlite*, by default this database is empty. 
To create the admin account you can do : 

```bash
node ./bin/createAdmin.js ADMIN ADMIN_PWD
```