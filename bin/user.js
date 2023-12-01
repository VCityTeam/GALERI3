const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { user, constants } = require('../src/shared');
const THREE = require('three');

let User = null;
let sequelize = null;

const connectToUserDB = async () => {
  if (!sequelize || !User) {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: './database/user.sqlite',
      define: { freezeTableName: true },
      logging: (data) => {
        // console.info(data);
      },
    });

    try {
      await sequelize.authenticate();
      console.log(
        'Authentification API connection has been established successfully.'
      );
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }

    User = sequelize.define('User', {
      uuid: DataTypes.STRING,
      nickname: DataTypes.STRING,
      hashPassword: DataTypes.STRING,
      role: DataTypes.STRING,
      pending: DataTypes.BOOLEAN,
    });

    await sequelize.sync(); // force db to be up to date with javascript (create one if there is not)
  }

  return { sequelize: sequelize, User: User };
};

const createUser = async (newUser, User, options = {}) => {
  const result = {
    user: null,
    error: null,
  };

  const existingUser = await User.findOne({
    where: { nickname: newUser.nickname },
  });

  if (existingUser) {
    result.error = newUser.nickname + ' already exists';
    return result;
  }

  const hashPassword = bcryptjs.hashSync(
    newUser.password,
    bcryptjs.genSaltSync(10)
  );

  const codeError = user.check(newUser);
  if (codeError) {
    result.error = user.codeErrorToString(codeError);
    return result;
  }

  result.user = await User.create({
    nickname: newUser.nickname,
    hashPassword: hashPassword,
    uuid: THREE.MathUtils.generateUUID(),
    role: options.role || constants.user.role.default,
    pending: options.pending || false,
  });

  return result;
};

const generateAccessToken = (user) => {
  const accessToken = jwt.sign(
    { nickname: user.nickname, role: user.role, uuid: user.uuid },
    process.env.TOKEN_SECRET
  );
  return accessToken;
};

const computeAccessTokenFromRequest = (req) => {
  const cookie = req.headers.cookie;
  if (!cookie || cookie == '') return null;

  let result = null;
  try {
    result = JSON.parse(cookie).accessToken;
  } catch (error) {
    console.log('cookie = ', cookie);
    console.info('Error reading cookie ', error);
  }

  return result;
};

const sendUserFromRequestToken = (req, res) => {
  const token = computeAccessTokenFromRequest(req);
  if (!token) res.send();

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) return res.send();
    res.send(user);
  });
};

const authenticateToken = (req, res, next) => {
  const token = computeAccessTokenFromRequest(req);

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    if (err) return res.sendStatus(403);
    // check if token user is still in database
    const { User } = await connectToUserDB();

    const userDb = await User.findOne({ where: { uuid: user.uuid } });

    if (!userDb) {
      res.sendStatus(401);
      return;
    }

    req.user = user;

    next();
  });
};

const authenticateAdminToken = (req, res, next) => {
  const token = computeAccessTokenFromRequest(req);

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    if (err) return res.sendStatus(403);

    // check if token user is still in database
    const { User } = await connectToUserDB();

    const userDb = await User.findOne({ where: { uuid: user.uuid } });

    if (!userDb) {
      res.sendStatus(401);
      return;
    }

    if (user.role != constants.user.role.admin) return res.sendStatus(401);

    req.user = user;

    next();
  });
};

module.exports = {
  connectToUserDB: connectToUserDB,
  generateAccessToken: generateAccessToken,
  authenticateToken: authenticateToken,
  authenticateAdminToken: authenticateAdminToken,
  sendUserFromRequestToken: sendUserFromRequestToken,
  createUser: createUser,
};
