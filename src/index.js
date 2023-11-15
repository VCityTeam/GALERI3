import './style.css';

import {
  createAuthentificationDomElement,
  isAccessTokenValid,
} from './authentification';

import { start } from './galeri3';
import { addLogos } from './logo';

// load config
const xhrConfig = new XMLHttpRequest();
xhrConfig.open('GET', window.location.origin + '/config.json');
xhrConfig.send();
const waitConfig = new Promise((resolve, reject) => {
  xhrConfig.onloadend = () => {
    if (
      xhrConfig.readyState == 4 &&
      xhrConfig.status >= 200 &&
      xhrConfig.status < 300
    ) {
      xhrConfig.responseText == ''
        ? resolve(null)
        : resolve(JSON.parse(xhrConfig.responseText));
    } else {
      reject(xhrConfig.status);
    }
  };
});
waitConfig.then((config) => {
  addLogos(document.body, config.logoPaths);
  // check access token
  isAccessTokenValid().then((response) => {
    if (response) {
      start(response, config);
    } else {
      // no user found with token
      const authDomElement = createAuthentificationDomElement(() => {
        isAccessTokenValid().then((response) => {
          if (response) {
            authDomElement.remove();
            start(response, config);
          } else {
            console.error('no response from backend');
          }
        });
      });
      document.body.appendChild(authDomElement);
    }
  });
});
