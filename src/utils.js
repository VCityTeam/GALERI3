import { Box3, Object3D } from 'three';
import './style.css'; // image container

// https://www.freecodecamp.org/news/how-to-reverse-a-string-in-javascript-in-3-different-ways-75e4763c68cb/
export const reverseString = (str) => {
  // Step 1. Use the split() method to return a new array
  const splitString = str.split(''); // var splitString = "hello".split("");
  // ["h", "e", "l", "l", "o"]

  // Step 2. Use the reverse() method to reverse the new created array
  const reverseArray = splitString.reverse(); // var reverseArray = ["h", "e", "l", "l", "o"].reverse();
  // ["o", "l", "l", "e", "h"]

  // Step 3. Use the join() method to join all elements of the array into a string
  const joinArray = reverseArray.join(''); // var joinArray = ["o", "l", "l", "e", "h"].join("");
  // "olleh"

  // Step 4. Return the reversed string
  return joinArray; // "olleh"
};

export const numberToLabel = (number) => {
  const numberString = reverseString(number + '');

  const parts = numberString.match(/.{1,3}/g);

  let result = '';
  for (let index = parts.length - 1; index >= 0; index--) {
    result += reverseString(parts[index]);
    if (index) result += ',';
  }

  return result;
};

// https://stackoverflow.com/questions/1500260/detect-urls-in-text-with-javascript
export const urlify = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, function (url) {
    return '<a target="_blank" href="' + url + '">' + url + '</a>';
  });
  // or alternatively
  // return text.replace(urlRegex, '<a href="$1">$1</a>')
};

export const unUrlify = (text) => {
  const buffer = document.createElement('div');
  buffer.innerHTML = text;
  return buffer.innerText;
};

export const request = async (url = '', data = {}, timeout = 100000) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

  try {
    xhr.send(JSON.stringify(data));
  } catch (error) {
    console.info('Request error ', error);
  }

  xhr.ontimeout = () => console.info(url, ' timeout');

  return new Promise((resolve, reject) => {
    xhr.onloadend = () => {
      if (xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 300) {
        xhr.responseText == ''
          ? resolve(null)
          : resolve(JSON.parse(xhr.responseText));
      } else {
        reject(xhr.status);
      }
    };
    xhr.timeout = timeout;
  });
};

export const setCookie = (key, stringValue) => {
  const cookie = document.cookie === '' ? {} : JSON.parse(document.cookie);
  cookie[key] = stringValue;
  document.cookie = JSON.stringify(cookie);
};

export class ImageContainer {
  constructor(imageSrc, uuid = null) {
    this.uuid = uuid;

    this.domElement = document.createElement('div');
    this.domElement.classList.add('image_container');

    this.image = document.createElement('img');
    this.image.src = imageSrc;
    this.domElement.appendChild(this.image);
  }
}

/**
 *
 * @param {Object3D} object3D - object 3D to center
 */
export const centerObject3DOnItsBoundingBox = (object3D) => {
  const bb = new Box3().setFromObject(object3D);
  bb.getCenter(object3D.position);
  object3D.traverse((child) => {
    if (child.geometry) {
      child.geometry.center();
    }
  });
};

export const setObject3DOpacity = (object3D, value) => {
  object3D.traverse((o) => {
    if (o.material) {
      o.material.opacity = value;
      o.material.transparent = value < 1;
      o.material.needsUpdate = true;
    }
  });
};
