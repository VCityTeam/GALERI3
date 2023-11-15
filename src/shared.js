// this is an example of a shared class that should be share between node and browser
module.exports = {
  user: {
    check: (user) => {
      if (user.password.length < 4) return 1;
      if (user.nickname == '') return 2;
      return 0;
    },
    codeErrorToString: (code) => {
      switch (code) {
        case 0:
          return 'No error';
        case 1:
          return 'Password must be superior at 3 character';
        case 2:
          return 'Nickname cant be empty';
        default:
          return 'Unknown error';
      }
    },
  },
  constants: {
    endPoint: {
      galeri3: {
        createConversation3D: '/create_conversation_3D',
        pullConversation3D: '/pull_conversation_3D',
        deleteConversation3D: '/delete_conversation_3D',
        pullConversation3DCommentMap: '/pull_conversation_3D_comment_map',
        pullComment: '/pull_comment',
        createComment: '/create_comment',
        deleteComment: '/delete_comment',
        updateComment: '/update_comment',
        deleteCommentImage: '/delete_comment_image',
        createGLTF: '/create_gltf',
        pullPendingGLTF: '/pull_pending_gltf',
        pullValidatedGLTF: '/pull_validated_gltf',
        validateGLTF: '/validate_gltf',
        deleteGLTF: '/delete_gltf',
        updateGLTF: '/update_gltf',
      },
      user: {
        pullUsers: '/pull_users',
        pullPendingUser: '/pull_pending_user',
        signUp: '/sign_up',
        login: '/login',
        accessTokenValid: '/access_token_valid',
        deleteUser: '/delete_user',
        validateUser: '/validate_user',
      },
    },
    user: {
      role: {
        admin: 'admin',
        default: 'default',
      },
    },
  },
};
