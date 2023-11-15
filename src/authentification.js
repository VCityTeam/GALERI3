import { createLabelInput } from '@ud-viz/utils_browser';
import { request, setCookie } from './utils';
import { constants, user } from './shared';

export const isAccessTokenValid = async () => {
  const response = await request(
    window.location.origin + constants.endPoint.user.accessTokenValid
  );

  return response;
};

export const createAuthentificationDomElement = (onLogSuccess) => {
  const result = document.createElement('div');

  // login
  const loginContainer = document.createElement('div');
  loginContainer.classList.add('centered_container');
  result.appendChild(loginContainer);

  // nickname
  const nickNameEl = createLabelInput('Pseudo: ', 'text');
  loginContainer.appendChild(nickNameEl.parent);

  // password
  const passwordEl = createLabelInput('Mot de passe: ', 'password');
  loginContainer.appendChild(passwordEl.parent);

  // login button
  const loginButton = document.createElement('button');
  loginButton.innerText = 'Connexion';
  loginContainer.appendChild(loginButton);

  loginButton.onclick = () => {
    request(window.location.origin + constants.endPoint.user.login, {
      nickname: nickNameEl.input.value,
      password: passwordEl.input.value,
    }).then((response) => {
      if (response.error) {
        alert(response.error);
      } else if (response.accessToken) {
        setCookie('accessToken', response.accessToken);
        onLogSuccess();
      } else {
        throw new Error('error response format');
      }
    });
  };

  // sign up

  const signUpDomElement = document.createElement('div');
  signUpDomElement.classList.add('centered_container');
  result.appendChild(signUpDomElement);

  // nickname input
  const nicknameSignUp = createLabelInput('Pseudo: ', 'text');
  signUpDomElement.appendChild(nicknameSignUp.parent);

  // password input
  const passwordSignUp = createLabelInput('Mot de passe: ', 'password');
  signUpDomElement.appendChild(passwordSignUp.parent);

  // confirm password
  const confirmPasswordSignUp = createLabelInput(
    'Confirmez mot de passe: ',
    'password'
  );
  signUpDomElement.appendChild(confirmPasswordSignUp.parent);

  // sign up button
  const signUpButton = document.createElement('button');
  signUpButton.innerText = 'Créer compte';
  signUpDomElement.appendChild(signUpButton);

  signUpButton.onclick = () => {
    if (passwordSignUp.input.value != confirmPasswordSignUp.input.value) {
      alert('Les mot de passes ne sont pas identique');
    }

    const newUser = {
      nickname: nicknameSignUp.input.value,
      password: passwordSignUp.input.value,
    };

    const codeError = user.check(newUser);
    if (codeError) {
      alert(user.codeErrorToString(codeError));
      return;
    }

    request(
      window.location.origin + constants.endPoint.user.signUp,
      newUser
    ).then((response) => {
      alert(response.message);
    });
  };

  const toggleSignUpDomElement = document.createElement('button');
  result.appendChild(toggleSignUpDomElement);

  // default state
  signUpDomElement.hidden = true;
  const updateLabel = () => {
    if (signUpDomElement.hidden) {
      toggleSignUpDomElement.innerText = 'Créer un compte';
    } else {
      toggleSignUpDomElement.innerText = 'Se connecter';
    }
  };
  updateLabel();

  toggleSignUpDomElement.onclick = () => {
    signUpDomElement.hidden = !signUpDomElement.hidden;
    loginContainer.hidden = !loginContainer.hidden;
    updateLabel();
  };

  return result;
};

export const createUserValidationDomElement = (onClose) => {
  const result = document.createElement('div');
  result.classList.add('centered_container');

  const label = document.createElement('div');
  label.innerText = 'Utilisateurs à valider';
  result.appendChild(label);

  const userPendingContainer = document.createElement('div');
  result.appendChild(userPendingContainer);

  const closeButton = document.createElement('button');
  closeButton.innerText = 'Fermer';
  result.appendChild(closeButton);

  closeButton.onclick = onClose;

  const updatePendingUser = () => {
    request(
      window.location.origin + constants.endPoint.user.pullPendingUser
    ).then((users) => {
      while (userPendingContainer.firstChild)
        userPendingContainer.firstChild.remove();

      users.forEach((user) => {
        const container = document.createElement('div');
        userPendingContainer.appendChild(container);

        // label name
        const labelNickname = document.createElement('div');
        labelNickname.innerText = user.nickname;
        container.appendChild(labelNickname);

        // validate button
        const validateButton = document.createElement('button');
        validateButton.innerText = 'Valider';
        container.appendChild(validateButton);
        validateButton.onclick = () => {
          request(
            window.location.origin +
              constants.endPoint.user.validateUser +
              '/' +
              user.uuid
          ).then(setTimeout(updatePendingUser, 1500));
        };

        // deny button
        const denyButton = document.createElement('button');
        denyButton.innerText = 'Refuser';
        container.appendChild(denyButton);
        denyButton.onclick = () => {
          request(
            window.location.origin +
              constants.endPoint.user.deleteUser +
              '/' +
              user.uuid
          ).then(setTimeout(updatePendingUser, 1500));
        };
      });
    });
  };

  const updateButton = document.createElement('button');
  updateButton.innerText = 'Mettre a jour liste utilisateur';
  updateButton.onclick = updatePendingUser;
  result.appendChild(updateButton);

  updatePendingUser();

  return result;
};
