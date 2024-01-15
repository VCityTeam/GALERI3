const express = require('express');
const THREE = require('three');
const galeri3Shared = require('../src/shared');
const { Sequelize, DataTypes } = require('sequelize');
const { stringReplace } = require('string-replace-middleware');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const {
  connectToUserDB,
  generateAccessToken,
  authenticateToken,
  sendUserFromRequestToken,
  createUser,
  authenticateAdminToken,
} = require('./user');
const bcryptjs = require('bcryptjs');
const { exec } = require('child-process-promise');
const gltfValidator = require('gltf-validator');
const { dataUriToBuffer } = require('@ud-viz/utils_shared');

// run an express app wrapper with a gamesocket service
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('Galeri3 server start on mode', NODE_ENV);

const CLIENT_FOLDER_PATH = './';
const ASSET_TYPE = {
  CONVERSATION3D: 'icon_conversation3D',
  GLTF_USER: 'gltf_user',
  COMMENT: 'image_comment',
};

/**
 *
 * @param {string} content - content of the file
 * @param {string} format - format of the file
 * @param {string} type - type of asset
 * @returns {{uuid:string, clientPath:string}} - client path and uuid of the asset
 */
const saveDatabasePrivateAsset = (content, format, type) => {
  const uuid = THREE.MathUtils.generateUUID();
  const commonPath =
    'database/private_assets/' + type + '/' + uuid + '.' + format;
  const serverPath = CLIENT_FOLDER_PATH + commonPath; // <== backend access this asset with this path
  const clientPath = './' + commonPath; // <== client access this asset with this path

  fs.writeFileSync(serverPath, content);

  return { clientPath: clientPath, uuid: uuid };
};

/**
 *
 * @param {string} clientPath - path of client
 */
const deleteDatabasePrivateAsset = (clientPath) => {
  if (!fs.existsSync(clientPath)) {
    console.info(clientPath + ' does not exists');
    return;
  }
  fs.unlinkSync(path.resolve(CLIENT_FOLDER_PATH, clientPath));
};

const createApp = async () => {
  const app = new express();

  app.use(
    stringReplace(
      {
        RUN_MODE: NODE_ENV,
      },
      {
        contentTypeFilterRegexp: /text\/html/,
      }
    )
  );

  // private assets
  const sendFileFromRequest = (req, res) => {
    const assetPath = path.resolve(
      process.cwd(),
      CLIENT_FOLDER_PATH + req.url.toString()
    );

    if (!fs.existsSync(assetPath)) {
      res.status(404);
      res.send();
    } else {
      res.send(fs.readFileSync(assetPath));
    }
  };

  // private_assets
  app.get('/private_assets/**', authenticateToken, sendFileFromRequest);
  // database private_assets
  app.get(
    '/database/private_assets/**',
    authenticateToken,
    sendFileFromRequest
  );

  // post json limit
  app.use(bodyParser.json({ limit: '100mb' }));

  const httpServer = app.listen(8000, (err) => {
    if (err) {
      console.error('Server does not start');
      return;
    }
    console.log('Http server listening on port', 8000);
  });

  httpServer.on('error', (err) => console.log(err));

  return app;
};

// Authentification
const runUserAPI = async (app) => {
  const { User } = await connectToUserDB();

  app.post(galeri3Shared.constants.endPoint.user.login, (req, res) => {
    console.log('login');
    if (req.body && req.body.nickname) {
      User.findOne({
        where: { nickname: req.body.nickname },
      })
        .then((user) => {
          if (!user) {
            res.send({
              accessToken: null,
              error: 'no user with nickname ' + req.body.nickname,
            });
          } else {
            if (bcryptjs.compareSync(req.body.password, user.hashPassword)) {
              if (user.pending) {
                res.send({
                  accessToken: null,
                  error: 'account pending (an admin must validate it)',
                });
              } else {
                // login success
                res.send({
                  accessToken: generateAccessToken(user),
                  error: null,
                });
              }
            } else {
              res.send({
                accessToken: null,
                error: 'wrong password ' + req.body.nickname,
              });
            }
          }
        })
        .catch((error) => console.error(error));
    } else {
      console.log(req);
    }
  });

  app.post(
    galeri3Shared.constants.endPoint.user.accessTokenValid,
    sendUserFromRequestToken
  );

  app.post(galeri3Shared.constants.endPoint.user.signUp, (req, res) => {
    const newUser = req.body;
    if (newUser) {
      createUser(newUser, User, { pending: true }).then((creationResult) => {
        if (creationResult.error) {
          res.send({ message: creationResult.error });
        } else {
          res.send({
            message:
              'User account has been created waiting an admin validation',
          });
        }
      });
    } else {
      res.send({ message: 'No user received' });
    }
  });

  // ADMIN END POINT

  app.post(
    galeri3Shared.constants.endPoint.user.pullPendingUser,
    authenticateAdminToken,
    (req, res) => {
      User.findAll({ where: { pending: true } }).then((users) => {
        const response = users.map((el) => {
          return { uuid: el.dataValues.uuid, nickname: el.dataValues.nickname };
        });
        res.send(response);
      });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.user.pullUsers,
    authenticateAdminToken,
    (req, res) => {
      User.findAll().then((users) => {
        const response = users.map((el) => {
          return {
            uuid: el.dataValues.uuid,
            nickname: el.dataValues.nickname,
            role: el.dataValues.role,
          };
        });
        res.send(response);
      });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.user.deleteUser + '/:uuid',
    authenticateAdminToken,
    (req, res) => {
      User.destroy({ where: { uuid: req.params.uuid } });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.user.validateUser + '/:uuid',
    authenticateAdminToken,
    (req, res) => {
      User.update({ pending: false }, { where: { uuid: req.params.uuid } });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.user.setRole,
    authenticateAdminToken,
    (req, res) => {
      if (req.body) {
        User.update(
          { role: req.body.role },
          { where: { uuid: req.body.uuid } }
        ).then(() => res.send());
      }
    }
  );

  console.log('Authentification API ready');
};

// Galeri3 API
const runGaleri3API = async (app) => {
  const createDirectory = async (path) => {
    if (!fs.existsSync(path)) await exec('mkdir -p ' + path);
  };

  // private assets not save in backup
  await createDirectory('./private_assets');

  await createDirectory('./database');
  await createDirectory('./database/private_assets');
  for (const type in ASSET_TYPE) {
    await createDirectory('./database/private_assets/' + ASSET_TYPE[type]);
  }

  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/galeri3.sqlite',
    define: { freezeTableName: true },
    logging: (data) => {
      // console.info(data);
    },
  });

  try {
    await sequelize.authenticate();
    console.log(
      'Conversation API connection has been established successfully.'
    );
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }

  // model definition
  const CommentImage = sequelize.define('CommentImage', {
    uuid: DataTypes.STRING,
    path: DataTypes.STRING,
  });

  const CommentImageMap = sequelize.define('CommentImageMap', {
    commentUUID: DataTypes.STRING,
    commentImageUUID: DataTypes.STRING,
  });

  const Comment = sequelize.define('Comment', {
    uuid: DataTypes.STRING,
    text: DataTypes.STRING,
    user_uuid: DataTypes.STRING,
    user_nickname: DataTypes.STRING,
  });

  const Conversation3D = sequelize.define('Conversation3D', {
    user_uuid: DataTypes.STRING,
    user_nickname: DataTypes.STRING,
    position: DataTypes.STRING,
    camera_position: DataTypes.STRING,
    name: DataTypes.STRING,
    uuid: DataTypes.STRING,
    image_path: DataTypes.STRING,
  });

  const Conversation3DCommentMap = sequelize.define(
    'Conversation3DCommentMap',
    {
      conversation3DUUID: DataTypes.STRING,
      commentUUID: DataTypes.STRING,
    }
  );

  const Object3D = sequelize.define('Object3D', {
    uuid: DataTypes.STRING,
    path: DataTypes.STRING,
    pending: DataTypes.BOOLEAN,
    name: DataTypes.STRING,
    user_uuid: DataTypes.STRING,
    user_nickname: DataTypes.STRING,
  });

  await sequelize.sync(); // force db to be up to date with javascript (create one if there is not)

  /**
   *
   * @param {string} commentUUID - uuid of the comment to delete
   * @param {string|null} userUUID - if null dont check user uuid otherwise userUUID must be equals to comment.user_uuid
   */
  const deleteComment = (commentUUID, userUUID = null) => {
    Comment.findOne({ where: { uuid: commentUUID } }).then((result) => {
      if (!userUUID || result.user_uuid == userUUID) {
        // destroy comment
        Comment.destroy({
          where: {
            uuid: commentUUID,
          },
        })
          .catch((error) => {
            console.info(error);
            throw new Error('cant destroy comment');
          })
          .then(() => console.log('comment deleted'));

        // destroy map with conversation 3D
        Conversation3DCommentMap.destroy({
          where: {
            commentUUID: commentUUID,
          },
        })
          .catch((error) => {
            console.info(error);
            throw new Error('cant destroy map');
          })
          .then(() => console.log('map deleted'));

        // delete images
        CommentImageMap.findAll({ where: { commentUUID: commentUUID } }).then(
          (maps) => {
            maps.forEach((map) => {
              CommentImage.findOne({
                where: { uuid: map.commentImageUUID },
              }).then((img) => {
                // delete image from disk
                deleteDatabasePrivateAsset(img.path);
                CommentImage.destroy({ where: { uuid: img.uuid } });
              });

              CommentImageMap.destroy({ where: { id: map.id } });
            });
          }
        );
      }
    });
  };

  // conversation3D

  app.post(
    galeri3Shared.constants.endPoint.galeri3.createConversation3D,
    authenticateToken,
    (req, res) => {
      if (req.body) {
        const result = saveDatabasePrivateAsset(
          dataUriToBuffer(req.body.dataURI),
          'jpeg',
          ASSET_TYPE.CONVERSATION3D
        );

        Conversation3D.create({
          position: req.body.position,
          camera_position: req.body.cameraPosition,
          name: req.body.name,
          uuid: result.uuid,
          image_path: result.clientPath,
          user_uuid: req.user.uuid,
          user_nickname: req.user.nickname,
        });
      }
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.pullConversation3D,
    authenticateToken,
    (req, res) => {
      Conversation3D.findAll().then((conversation3D) => {
        res.send(conversation3D);
      });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.deleteConversation3D + '/:uuid',
    authenticateToken,
    (req, res) => {
      Conversation3D.findOne({ where: { uuid: req.params.uuid } }).then((c) => {
        if (
          req.user.role == galeri3Shared.constants.user.role.admin ||
          c.user_uuid == req.user.uuid
        ) {
          // delete image
          deleteDatabasePrivateAsset(c.image_path);

          Conversation3D.destroy({
            where: {
              uuid: req.params.uuid,
            },
          });

          // delete maps and comments associated
          Conversation3DCommentMap.findAll({
            where: {
              conversation3DUUID: req.params.uuid,
            },
          }).then((maps) => {
            maps.forEach((map) => {
              deleteComment(map.commentUUID); // <== will delete comment even the ones not created by req.user
            });
          });
        }
      });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.pullConversation3DCommentMap +
      '/:uuid',
    authenticateToken,
    (req, res) => {
      Conversation3DCommentMap.findAll({
        where: {
          conversation3DUUID: req.params.uuid,
        },
      })
        .then((map) => {
          res.send(map);
        })
        .catch((error) => {
          console.info(error);
          throw new Error('error pull map');
        });
    },
    (error) => console.error(error)
  );

  // comment

  app.post(
    galeri3Shared.constants.endPoint.galeri3.createComment,
    authenticateToken,
    (req, res) => {
      if (req.body) {
        const commentUUID = THREE.MathUtils.generateUUID();

        Comment.create({
          user_uuid: req.user.uuid,
          user_nickname: req.user.nickname,
          text: req.body.text,
          uuid: commentUUID,
        })
          .catch((error) => {
            console.info(error);
            throw new Error('cannot create comment');
          })
          .then(() => console.log('comment created'));

        // map with conversation
        Conversation3DCommentMap.create({
          commentUUID: commentUUID,
          conversation3DUUID: req.body.conversation3DUUID,
        })
          .catch((error) => {
            console.info(error);
            throw new Error('cannot create map');
          })
          .then(() => console.log('map created'));

        // create images associated
        req.body.dataURIS.forEach((dataURI) => {
          if (typeof dataURI == 'string' && dataURI.startsWith('data:image')) {
            const result = saveDatabasePrivateAsset(
              dataUriToBuffer(dataURI),
              'jpeg',
              ASSET_TYPE.COMMENT
            );

            CommentImage.create({
              uuid: result.uuid,
              path: result.clientPath,
            });

            CommentImageMap.create({
              commentUUID: commentUUID,
              commentImageUUID: result.uuid,
            });
          }
        });
      }
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.updateComment + '/:uuid',
    authenticateToken,
    (req, res) => {
      Comment.findOne({ where: { uuid: req.params.uuid } }).then((comment) => {
        if (
          req.user.role == galeri3Shared.constants.user.role.admin ||
          req.user.uuid == comment.user_uuid
        ) {
          Comment.update(
            { text: req.body.text },
            { where: { uuid: req.params.uuid } }
          ).then(() => res.send());
        }
      });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.pullComment + '/:uuid',
    authenticateToken,
    (req, res) => {
      const body = { comment: null, commentImages: [] };

      const commentPromise = Comment.findOne({
        where: {
          uuid: req.params.uuid,
        },
      })
        .then((result) => {
          body.comment = result;
        })
        .catch((error) => {
          console.info(error);
          throw new Error('error pulling comment');
        });

      // find images
      const imagesPromise = new Promise((resolve) => {
        CommentImageMap.findAll({
          where: { commentUUID: req.params.uuid },
        }).then((maps) => {
          if (!maps.length) resolve();

          maps.forEach((map) => {
            CommentImage.findOne({
              where: { uuid: map.commentImageUUID },
            }).then((img) => {
              body.commentImages.push(img);
              if (body.commentImages.length === maps.length) resolve();
            });
          });
        });
      });

      Promise.all([commentPromise, imagesPromise]).then(() => res.send(body));
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.deleteComment + '/:uuid',
    authenticateToken,
    (req, res) => {
      deleteComment(req.params.uuid, req.user.uuid);
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.deleteCommentImage + '/:uuid',
    authenticateToken,
    (req, res) => {
      // find comment
      CommentImageMap.findOne({
        where: { commentImageUUID: req.params.uuid },
      }).then((map) => {
        Comment.findOne({ where: { uuid: map.commentUUID } }).then(
          (comment) => {
            if (
              req.user.role == galeri3Shared.constants.user.role.admin ||
              req.user.uuid == comment.user_uuid
            ) {
              // delete comment image
              CommentImage.findOne({
                where: { uuid: map.commentImageUUID },
              }).then((commentImage) => {
                deleteDatabasePrivateAsset(
                  path.resolve(CLIENT_FOLDER_PATH, commentImage.path)
                );
                Promise.all([
                  CommentImage.destroy({
                    where: { uuid: map.commentImageUUID },
                  }),
                  CommentImageMap.destroy({
                    where: { commentImageUUID: map.commentImageUUID },
                  }),
                ]).then(() => res.send());
              });
            }
          }
        );
      });
    }
  );

  // gltf

  app.post(
    galeri3Shared.constants.endPoint.galeri3.createGLTF,
    authenticateToken,
    (req, res) => {
      if (req.body) {
        const gltfContent = JSON.stringify(req.body.gltf);

        gltfValidator
          .validateString(gltfContent)
          .then((report) => {
            console.log('gltf validated');
            const { clientPath, uuid } = saveDatabasePrivateAsset(
              gltfContent,
              'gltf',
              ASSET_TYPE.GLTF_USER
            );

            Object3D.create({
              uuid: uuid,
              name: req.body.name,
              pending: true,
              path: clientPath,
              user_uuid: req.user.uuid,
              user_nickname: req.user.nickname,
            }).then(() => {
              res.send({ message: 'gltf ' + req.body.name + ' created' });
            });
          })
          .catch((error) => console.error('Validation failed: ', error));
      }
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.pullPendingGLTF,
    authenticateAdminToken,
    (req, res) => {
      Object3D.findAll({ where: { pending: true } }).then((result) =>
        res.send(result)
      );
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.validateGLTF + '/:uuid',
    authenticateAdminToken,
    (req, res) => {
      Object3D.update(
        { pending: false },
        { where: { uuid: req.params.uuid } }
      ).then(() => res.send());
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.deleteGLTF + '/:uuid',
    authenticateToken,
    (req, res) => {
      Object3D.findOne({ where: { uuid: req.params.uuid } }).then((result) => {
        if (
          req.user.role == galeri3Shared.constants.user.role.admin ||
          req.user.uuid == result.user_uuid
        ) {
          Object3D.destroy({ where: { uuid: req.params.uuid } });
          deleteDatabasePrivateAsset(result.path);
        }
      });
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.pullValidatedGLTF,
    authenticateToken,
    (req, res) => {
      Object3D.findAll({ where: { pending: false } }).then((result) =>
        res.send(result)
      );
    }
  );

  app.post(
    galeri3Shared.constants.endPoint.galeri3.updateGLTF + '/:uuid',
    authenticateToken,
    (req, res) => {
      Object3D.findOne({ where: { uuid: req.params.uuid } }).then((object) => {
        if (
          req.user.role == galeri3Shared.constants.user.role.admin ||
          object.user_uuid == req.user.uuid
        ) {
          const gltfContent = JSON.stringify(req.body.gltf);

          gltfValidator
            .validateString(gltfContent)
            .then((report) => {
              console.log('gltf validated');
              const serverPath = path.resolve(CLIENT_FOLDER_PATH, object.path);
              fs.writeFileSync(serverPath, gltfContent);
              res.send({ message: 'gltf ' + object.name + ' updated' });
            })
            .catch((error) => console.error('Validation failed: ', error));
        } else {
          res.sendStatus(401);
        }
      });
    }
  );

  console.log('Galeri3 API ready');
};

const run = async () => {
  const app = await createApp();
  await runUserAPI(app);
  await runGaleri3API(app);
  app.use(express.static(CLIENT_FOLDER_PATH + 'public/'));
  console.info('backend ready');
};

run();
