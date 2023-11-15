const { constants } = require('../src/shared');
const { connectToUserDB, createUser } = require('./user');

const createAdmin = async () => {
  const { User } = await connectToUserDB();

  createUser(
    {
      nickname: process.argv[2],
      password: process.argv[3],
    },
    User,
    {
      role: constants.user.role.admin,
      pending: false,
    }
  );
};

createAdmin();
