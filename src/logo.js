import './style.css';

export const addLogos = (parent, paths) => {
  const logoContainer = document.createElement('div');
  logoContainer.setAttribute('id', 'galeri3-logo-container');
  parent.appendChild(logoContainer);

  paths.forEach((pathLogo) => {
    const image = document.createElement('img');
    image.src = pathLogo;
    logoContainer.appendChild(image);
  });
};
