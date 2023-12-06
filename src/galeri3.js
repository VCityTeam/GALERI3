import {
  createLabelInput,
  readSingleFileAsDataUrl,
  readFileAsGltf,
  downloadObjectAsJson,
  initScene,
  createLocalStorageDetails,
  createLocalStorageSlider,
  createLocalStorageCheckbox,
  cameraFitRectangle,
} from '@ud-viz/utils_browser';

import { PointCloudVisualizer } from '@ud-viz/point_cloud_visualizer';

import { Bookmark } from '@ud-viz/widget_bookmark';

import * as proj4 from 'proj4';

import * as itowns from 'itowns';

import * as THREE from 'three';

import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

import { removeFromArray, vector3ToLabel } from '@ud-viz/utils_shared';

import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { constants } from './shared';

import {
  request,
  urlify,
  unUrlify,
  setCookie,
  numberToLabel,
  ImageContainer,
  centerObject3DOnItsBoundingBox,
  setObject3DOpacity,
} from './utils';

import { createUserValidationDomElement } from './authentification';
import { LayerChoice } from '@ud-viz/widget_layer_choice';

export const start = (user, config = {}) => {
  console.log(config);
  //* ****************************************************************************** APP CONTEXT START */

  const crs = config.crs;

  // define what is EPSG:3946
  if (crs == 'EPSG:3946')
    proj4.default.defs(
      'EPSG:3946',
      '+proj=lcc +lat_1=45.25 +lat_2=46.75' +
        ' +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );

  const extent = new itowns.Extent(
    crs,
    config.extent.west,
    config.extent.east,
    config.extent.south,
    config.extent.north
  );

  const domElementUI = document.createElement('div');
  domElementUI.setAttribute('id', 'ui_container');
  document.body.appendChild(domElementUI);
  // add 3DTiles point cloud
  const defaultPointCloudSize = 0.03;
  const pointCloudVisualizer = new PointCloudVisualizer(
    extent,
    config.pointClouds,
    {
      parentDomElement: document.body,
      domElementClass: 'full_screen',
      c3DTilesLoadingDomElementClasses: ['loading', 'centered_container'],
      defaultPointCloudSize: defaultPointCloudSize,
      measure: true,
    }
  );

  const renderer = pointCloudVisualizer.itownsView.mainLoop.gfxEngine.renderer;

  initScene(
    pointCloudVisualizer.itownsView.camera.camera3D,
    pointCloudVisualizer.itownsView.mainLoop.gfxEngine.renderer,
    pointCloudVisualizer.itownsView.scene,
    {
      cameraFov: config.camera.fov,
      sky: {
        color: config.skyColor,
      },
    }
  );

  // add color layers
  config.colorLayers.forEach((params) => {
    pointCloudVisualizer.itownsView.addLayer(
      new itowns.ColorLayer(THREE.MathUtils.generateUUID(), {
        source: new itowns.WMSSource({
          url: params.source.url,
          format: params.source.format,
          name: params.source.name,
          extent: extent,
          crs: crs,
        }),
        transparent: true,
        name: params.name,
      })
    );
  });

  // add elevation layers
  config.elevationLayers.forEach((params) => {
    pointCloudVisualizer.itownsView.addLayer(
      new itowns.ElevationLayer(THREE.MathUtils.generateUUID(), {
        name: 'Elevation',
        source: new itowns.WMSSource({
          url: params.source.url,
          crs: crs,
          format: params.source.format,
          name: params.source.name,
          heightMapWidth: params.source.heightMapWidth,
          extent: extent,
        }),
        colorTextureElevationMinZ: params.colorTextureElevationMinZ,
        colorTextureElevationMaxZ: params.colorTextureElevationMaxZ,
        useColorTextureElevation: true,
      })
    );
  });

  // top left container
  const leftPanDomElement = document.createElement('div');
  leftPanDomElement.setAttribute('id', 'leftPan');
  leftPanDomElement.onclick = (event) => event.stopImmediatePropagation(); //  cannot click through
  domElementUI.appendChild(leftPanDomElement);

  // settings
  const settingsDetails = createLocalStorageDetails(
    'settings_details',
    'Paramètres',
    leftPanDomElement
  );

  settingsDetails.appendChild(pointCloudVisualizer.domElementSpeedControls);
  settingsDetails.appendChild(pointCloudVisualizer.clippingPlaneDetails);
  pointCloudVisualizer.domElementTargetDragElement.classList.add(
    'draggable-element'
  );
  leftPanDomElement.appendChild(
    pointCloudVisualizer.domElementTargetDragElement
  );
  leftPanDomElement.appendChild(pointCloudVisualizer.measureDomElement);

  //* ****************************************************************************** APP CONTEXT END */

  // resizable left pan
  {
    const leftPanStyle = window.getComputedStyle(leftPanDomElement);

    const sliderWidthLeftPan = createLocalStorageSlider(
      'left-pan-width',
      'Taille ui',
      settingsDetails,
      {
        min: parseInt(leftPanStyle.getPropertyValue('min-width')),
        max: parseInt(leftPanStyle.getPropertyValue('max-width')),
        step: 'any',
        defaultValue: config.ui.defaultLeftPanWidth,
      }
    );

    const updateLeftPanWidth = () => {
      leftPanDomElement.style.width = sliderWidthLeftPan.valueAsNumber + 'px';
    };
    sliderWidthLeftPan.onchange = updateLeftPanWidth;
    updateLeftPanWidth();
  }

  // user
  {
    // user name label
    const nameLabel = document.createElement('div');
    nameLabel.innerText = user.nickname;
    leftPanDomElement.appendChild(nameLabel);

    // user role label
    const roleLabel = document.createElement('div');
    roleLabel.innerText = user.role;
    leftPanDomElement.appendChild(roleLabel);

    // user validation
    {
      if (user.role == constants.user.role.admin) {
        const userValidationDomElement = createUserValidationDomElement(
          () => (userValidationDomElement.hidden = true)
        );
        userValidationDomElement.hidden = true;
        domElementUI.appendChild(userValidationDomElement);

        const addValidationDomElement = document.createElement('button');
        addValidationDomElement.innerText = 'Valider des utilisateurs';
        leftPanDomElement.appendChild(addValidationDomElement);

        addValidationDomElement.onclick = () => {
          userValidationDomElement.hidden = false;
        };
      }
    }

    // user deletion
    {
      if (user.role == constants.user.role.admin) {
        const userDeletionDomElement = createLocalStorageDetails(
          'user_deletion_key',
          'Supprimer des utilisateurs',
          leftPanDomElement
        );

        const udpateButton = document.createElement('button');
        udpateButton.innerText = 'Mettre à jour';
        userDeletionDomElement.appendChild(udpateButton);

        const usersContainer = document.createElement('div');
        userDeletionDomElement.appendChild(usersContainer);

        const updateUsers = () => {
          request(window.origin + constants.endPoint.user.pullUsers).then(
            (users) => {
              while (usersContainer.firstChild)
                usersContainer.firstChild.remove();

              users.forEach((user) => {
                const deletionButton = document.createElement('button');
                deletionButton.innerText = 'Supprimer ' + user.nickname;
                usersContainer.appendChild(deletionButton);

                deletionButton.onclick = () => {
                  if (confirm(deletionButton.innerText + ' ?')) {
                    request(
                      window.origin +
                        constants.endPoint.user.deleteUser +
                        '/' +
                        user.uuid
                    ).then(setTimeout(updateUsers, 1500));
                  }
                };
              });
            }
          );
        };

        udpateButton.onclick = updateUsers;
      }
    }

    // logout button
    const logoutButton = document.createElement('button');
    logoutButton.innerText = 'Deconnexion';
    leftPanDomElement.appendChild(logoutButton);

    logoutButton.onclick = () => {
      // clean cookie
      setCookie('accessToken', null);
      window.location.reload();
    };
  }

  // fold containerTl
  {
    let fold = false;
    const buttonFold = document.createElement('button');
    buttonFold.classList.add('button_fold');
    document.body.appendChild(buttonFold);
    const updateContainerTL = () => {
      if (!fold) {
        buttonFold.innerText = 'cacher ui';
        leftPanDomElement.style.transform = 'translate(0%,0%)';
      } else {
        buttonFold.innerText = 'afficher ui';
        leftPanDomElement.style.transform = 'translate(-100%,0%)';
      }
    };
    updateContainerTL();
    buttonFold.onclick = () => {
      fold = !fold;
      updateContainerTL();
    };

    // on camera move ui is folded
    const checkboxFoldUICamera = createLocalStorageCheckbox(
      'fold_ui_camera_move',
      "Replier l'interface quand la camera bouge",
      settingsDetails
    );

    let foldBuffer = fold;
    pointCloudVisualizer.orbitControls.addEventListener('start', () => {
      if (!checkboxFoldUICamera.checked) return;
      foldBuffer = fold;
      fold = true;
      updateContainerTL();
    });
    pointCloudVisualizer.orbitControls.addEventListener('end', () => {
      if (!checkboxFoldUICamera.checked) return;
      fold = foldBuffer;
      updateContainerTL();
    });
  }

  // gltf
  {
    const gltfDetails = createLocalStorageDetails(
      'gltf_details',
      'Objets 3D',
      leftPanDomElement
    );

    const exporter = new GLTFExporter();

    // when gltf is exported the scene is added into the hierarchy, so to get the original gltf with the same hierarchy we have to "remove" the scene
    const fromGLTFSceneToMesh = (gltf) => gltf.scene.children[0]; // TODO do something better

    const transformControls = new TransformControls(
      pointCloudVisualizer.itownsView.camera.camera3D,
      pointCloudVisualizer.itownsView.mainLoop.gfxEngine.label2dRenderer.domElement
    );
    transformControls.addEventListener('dragging-changed', (event) => {
      pointCloudVisualizer.orbitControls.enabled = !event.value;
    });
    transformControls.addEventListener('change', () => {
      transformControls.updateMatrixWorld();
      pointCloudVisualizer.itownsView.notifyChange(
        pointCloudVisualizer.itownsView.camera.camera3D
      );
    });
    pointCloudVisualizer.itownsView.addFrameRequester(
      itowns.MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE,
      () => {
        transformControls.updateMatrixWorld();
      }
    );

    // transform control ui

    const transformControlsDetails = createLocalStorageDetails(
      'transform_controls',
      'Gizmo',
      gltfDetails
    );

    const addButtonMode = (mode) => {
      const buttonMode = document.createElement('button');
      buttonMode.innerText = mode;
      transformControlsDetails.appendChild(buttonMode);

      buttonMode.onclick = () => {
        transformControls.setMode(mode);
      };
    };
    addButtonMode('translate');
    addButtonMode('rotate');
    addButtonMode('scale');

    const selectTransformControls = (o) => {
      transformControls.attach(o);
      transformControls.updateMatrixWorld();
      pointCloudVisualizer.itownsView.scene.add(transformControls);
    };

    const removeTransformControls = () => {
      pointCloudVisualizer.itownsView.scene.remove(transformControls);
      transformControls.detach();
    };

    window.addEventListener('keyup', (event) => {
      if (event.key == 'Escape') {
        removeTransformControls();
      }
    });

    // validation gltf
    {
      if (user.role == constants.user.role.admin) {
        const validationGLTFContainer = createLocalStorageDetails(
          'validation_gltf_details',
          'Valider gltf',
          gltfDetails
        );

        // gltf validation for admin
        const pullGLTFToValidateButton = document.createElement('button');
        pullGLTFToValidateButton.innerText = 'Mettre a jour';
        validationGLTFContainer.appendChild(pullGLTFToValidateButton);

        const listGLTFToValidate = document.createElement('div');
        validationGLTFContainer.appendChild(listGLTFToValidate);

        const gltfLoader = new GLTFLoader();
        const parentGltfToValidate = new THREE.Object3D();
        pointCloudVisualizer.itownsView.scene.add(parentGltfToValidate);

        const updateGLTFToValidate = () => {
          request(
            window.location.origin + constants.endPoint.galeri3.pullPendingGLTF
          ).then((gltfsToValidate) => {
            // reset
            while (listGLTFToValidate.firstChild)
              listGLTFToValidate.firstChild.remove();

            while (parentGltfToValidate.children.length) {
              if (parentGltfToValidate.children[0] == transformControls.object)
                removeTransformControls();
              parentGltfToValidate.remove(parentGltfToValidate.children[0]);
            }

            gltfsToValidate.forEach((el) => {
              const domElement = document.createElement('div');
              domElement.innerText =
                el.name + ' created by ' + el.user_nickname;
              listGLTFToValidate.appendChild(domElement);

              // load gltf
              gltfLoader.load(el.path, (gltf) => {
                const mesh = fromGLTFSceneToMesh(gltf);

                parentGltfToValidate.add(mesh);

                // opacity
                const opacitySlider = createLabelInput('Opacity: ', 'range');
                domElement.appendChild(opacitySlider.parent);
                opacitySlider.input.min = 0;
                opacitySlider.input.max = 1;
                opacitySlider.input.step = 'any';
                const defaultOpacity = 1; // choose to set opacity to one for mesh
                opacitySlider.input.value = defaultOpacity;
                setObject3DOpacity(mesh, defaultOpacity);
                opacitySlider.input.onchange = () => {
                  setObject3DOpacity(mesh, opacitySlider.input.valueAsNumber);
                };

                // visualize
                const buttonVisualize = document.createElement('button');
                buttonVisualize.innerText = 'visualize';
                domElement.appendChild(buttonVisualize);

                buttonVisualize.onclick = () => {
                  const bb = new THREE.Box3().setFromObject(mesh);
                  pointCloudVisualizer.moveCamera(
                    null,
                    bb.getCenter(new THREE.Vector3())
                  );
                };

                // validate button
                const validateButton = document.createElement('button');
                validateButton.innerText = 'valider';
                domElement.appendChild(validateButton);

                validateButton.onclick = () => {
                  request(
                    window.location.origin +
                      constants.endPoint.galeri3.validateGLTF +
                      '/' +
                      el.uuid
                  ).then(updateGLTFToValidate);
                };

                // delete button
                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'supprimer';
                domElement.appendChild(deleteButton);

                deleteButton.onclick = () => {
                  if (confirm('Supprimer ?')) {
                    request(
                      window.location.origin +
                        constants.endPoint.galeri3.deleteGLTF +
                        '/' +
                        el.uuid
                    );
                  }
                };

                // select button
                const selectButton = document.createElement('button');
                selectButton.innerText = 'select';
                domElement.appendChild(selectButton);

                selectButton.onclick = () => selectTransformControls(mesh); // because we know that's the strcuture

                // save modification
                const updateContent = document.createElement('button');
                updateContent.innerText = 'update';
                domElement.appendChild(updateContent);

                updateContent.onclick = () => {
                  // Parse the input and generate the glTF output
                  exporter.parse(
                    mesh,
                    // called when the glb has been generated
                    function (gltf) {
                      request(
                        window.location.origin +
                          constants.endPoint.galeri3.updateGLTF +
                          '/' +
                          el.uuid,
                        { gltf: gltf }
                      ).then(updateGLTFToValidate);
                    },
                    // called when there is an error in the generation
                    function (error) {
                      console.log('An error happened ', error);
                    }
                  );
                };
              });
            });
          });
        };

        pullGLTFToValidateButton.onclick = updateGLTFToValidate;
      }
    }

    // visualize gltf validated
    {
      const validatedGLTFContainer = createLocalStorageDetails(
        'validated_gltf_details',
        'gltf',
        gltfDetails
      );

      const parentGltfValidated = new THREE.Object3D();
      pointCloudVisualizer.itownsView.scene.add(parentGltfValidated);

      const updateGLTFValidatedButton = document.createElement('button');
      updateGLTFValidatedButton.innerText = 'Mettre à jour';
      validatedGLTFContainer.appendChild(updateGLTFValidatedButton);

      const listGLTFValidated = document.createElement('div');
      validatedGLTFContainer.appendChild(listGLTFValidated);
      const gltfLoader = new GLTFLoader();

      const updateGLTFValidated = () => {
        request(
          window.location.origin + constants.endPoint.galeri3.pullValidatedGLTF
        ).then((object3DsValidated) => {
          // reset
          while (listGLTFValidated.firstChild)
            listGLTFValidated.firstChild.remove();

          while (parentGltfValidated.children.length) {
            if (parentGltfValidated.children[0] == transformControls.object)
              removeTransformControls();
            parentGltfValidated.remove(parentGltfValidated.children[0]);
          }

          object3DsValidated.forEach((object3D) => {
            const domElement = document.createElement('div');
            domElement.innerText =
              object3D.name + ' created by ' + object3D.user_nickname;
            listGLTFValidated.appendChild(domElement);

            // delete button
            if (
              user.role == constants.user.role.admin ||
              user.uuid == object3D.user_uuid
            ) {
              const deleteButton = document.createElement('button');
              deleteButton.innerText = 'supprimer';
              domElement.appendChild(deleteButton);

              deleteButton.onclick = () => {
                if (confirm('Supprimer ?')) {
                  request(
                    window.location.origin +
                      constants.endPoint.galeri3.deleteGLTF +
                      '/' +
                      object3D.uuid
                  );
                }
              };
            }

            gltfLoader.load(object3D.path, (gltf) => {
              const mesh = fromGLTFSceneToMesh(gltf);

              parentGltfValidated.add(mesh);
              mesh.visible = false;

              // visualize
              const buttonVisualize = document.createElement('button');
              buttonVisualize.innerText = 'visualize';
              domElement.appendChild(buttonVisualize);

              const visible = createLabelInput('visible', 'checkbox');
              visible.input.checked = false; // false by default
              domElement.appendChild(visible.parent);
              visible.input.onchange = () => {
                mesh.visible = visible.input.checked;
              };

              buttonVisualize.onclick = () => {
                if (!mesh.visible) {
                  visible.input.checked = true;
                  mesh.visible = true;
                }

                const bb = new THREE.Box3().setFromObject(mesh);
                pointCloudVisualizer.moveCamera(
                  null,
                  bb.getCenter(new THREE.Vector3())
                );
              };

              // opacity
              const opacitySlider = createLabelInput('Opacity: ', 'range');
              domElement.appendChild(opacitySlider.parent);
              opacitySlider.input.min = 0;
              opacitySlider.input.max = 1;
              opacitySlider.input.step = 'any';
              const defaultOpacity = 1; // choose to set opacity to one for mesh
              opacitySlider.input.value = defaultOpacity;
              setObject3DOpacity(mesh, defaultOpacity);
              opacitySlider.input.onchange = () => {
                setObject3DOpacity(mesh, opacitySlider.input.valueAsNumber);
              };

              if (
                user.role == constants.user.role.admin ||
                user.uuid == object3D.user_uuid
              ) {
                // select
                const selectButton = document.createElement('button');
                selectButton.innerText = 'select';
                domElement.appendChild(selectButton);
                selectButton.onclick = () => selectTransformControls(mesh);

                // update
                const updateContent = document.createElement('button');
                updateContent.innerText = 'update';
                domElement.appendChild(updateContent);

                updateContent.onclick = () => {
                  // Parse the input and generate the glTF output
                  exporter.parse(
                    mesh,
                    // called when the glb has been generated
                    function (gltf) {
                      request(
                        window.location.origin +
                          constants.endPoint.galeri3.updateGLTF +
                          '/' +
                          object3D.uuid,
                        { gltf: gltf }
                      ).then(updateGLTFValidated);
                    },
                    // called when there is an error in the generation
                    function (error) {
                      console.log('An error happened ', error);
                    }
                  );
                };
              }
            });
          });
        });
      };

      updateGLTFValidated();
      updateGLTFValidatedButton.onclick = updateGLTFValidated;
    }

    // import local gltf
    {
      const importedObjectsDomElement = createLocalStorageDetails(
        'imported_gltf_details',
        'Importer glb/gltf',
        gltfDetails
      );

      const listObjectsContainer = document.createElement('div');
      importedObjectsDomElement.appendChild(listObjectsContainer);

      const LOCALSTORAGE_KEY_GLTF_IMPORTED = 'localstorage_key_gltf_imported';
      const parentObject3D = new THREE.Object3D();

      const localStorageSaveGLTFImported = () => {
        // register matrix4 object imported

        let buffer = localStorage.getItem(LOCALSTORAGE_KEY_GLTF_IMPORTED);
        if (!buffer) buffer = '{}'; // init

        const bufferObject = JSON.parse(buffer);

        parentObject3D.children.forEach((child) => {
          bufferObject[child.name] = child.matrixWorld.toArray();
        });

        localStorage.setItem(
          LOCALSTORAGE_KEY_GLTF_IMPORTED,
          JSON.stringify(bufferObject)
        );
      };

      window.addEventListener('beforeunload', localStorageSaveGLTFImported);

      const updateObjectsList = () => {
        while (listObjectsContainer.firstChild)
          listObjectsContainer.firstChild.remove();

        parentObject3D.children.forEach((child) => {
          const el = document.createElement('div');

          // name
          const label = document.createElement('div');
          label.innerText = child.name;
          el.appendChild(label);

          // go to
          const goToButton = document.createElement('button');
          goToButton.innerText = 'go to';
          el.appendChild(goToButton);

          goToButton.onclick = () => {
            const bb = new THREE.Box3().setFromObject(child);
            cameraFitRectangle(
              pointCloudVisualizer.itownsView.camera.camera3D,
              bb.min,
              bb.max,
              bb.max.z
            );
            bb.getCenter(pointCloudVisualizer.orbitControls.target);
            pointCloudVisualizer.itownsView.notifyChange();
          };

          // opacity
          const opacitySlider = createLabelInput('Opacity: ', 'range');
          el.appendChild(opacitySlider.parent);
          opacitySlider.input.min = 0;
          opacitySlider.input.max = 1;
          opacitySlider.input.step = 'any';
          const defaultOpacity = 1; // choose to set opacity to one for child
          opacitySlider.input.value = defaultOpacity;
          setObject3DOpacity(child, defaultOpacity);
          opacitySlider.input.onchange = () => {
            setObject3DOpacity(child, opacitySlider.input.valueAsNumber);
          };

          // select
          const selectButton = document.createElement('button');
          selectButton.innerText = 'selectionner';
          el.appendChild(selectButton);
          selectButton.onclick = () => {
            selectTransformControls(child);
          };

          // delete
          const deleteButton = document.createElement('button');
          deleteButton.innerText = 'Supprimer';
          el.appendChild(deleteButton);
          deleteButton.onclick = () => {
            if (confirm('Supprimer ?')) {
              localStorageSaveGLTFImported(); // TODO : opti just save the gltf removed
              if (transformControls.object === child) removeTransformControls();
              parentObject3D.remove(child);
              updateObjectsList();
            }
          };

          // submit
          const submitButton = document.createElement('button');
          submitButton.innerText = 'Submit';
          el.appendChild(submitButton);
          submitButton.onclick = () => {
            const name = prompt("Nom  de l'objet ?");

            // Parse the input and generate the glTF output
            exporter.parse(
              child,
              // called when the glb has been generated
              function (gltf) {
                request(
                  window.location.origin +
                    constants.endPoint.galeri3.createGLTF,
                  {
                    name: name,
                    gltf: gltf,
                  }
                );
              },
              // called when there is an error in the generation
              function (error) {
                console.log('An error happened ', error);
              }
            );
          };

          // download json matrix4
          const downloadJSONCoordJSON = document.createElement('button');
          downloadJSONCoordJSON.innerText = 'Télécharger les coordonnées';
          el.appendChild(downloadJSONCoordJSON);

          downloadJSONCoordJSON.onclick = () => {
            downloadObjectAsJson(
              { matrix4: child.matrixWorld.toArray() },
              'galeri3_coord'
            );
          };

          // apply from a json file
          const applyCoordJSON = createLabelInput(
            'Appliquer un fichier coord json',
            'file'
          );
          applyCoordJSON.input.setAttribute('accept', '.json');
          el.appendChild(applyCoordJSON.parent);
          applyCoordJSON.input.oninput = (e) => {
            const f = new FileReader();
            f.onload = (ev) => {
              try {
                const text = ev.target.result;
                const json = JSON.parse(text);
                new THREE.Matrix4()
                  .fromArray(json.matrix4)
                  .decompose(child.position, child.quaternion, child.scale);
              } catch (error) {
                alert(error);
              }
            };
            f.readAsText(e.target.files[0]);
          };

          listObjectsContainer.appendChild(el);
        });
      };

      parentObject3D.name = 'imported_objects';
      pointCloudVisualizer.itownsView.scene.add(parentObject3D);
      const inputFile = document.createElement('input');
      inputFile.setAttribute('type', 'file');
      inputFile.setAttribute('accept', '.glb, .gltf');
      importedObjectsDomElement.appendChild(inputFile);
      inputFile.oninput = async (e) => {
        readFileAsGltf(e)
          .then((gltf) => {
            const mesh = gltf.scene; // here no children

            centerObject3DOnItsBoundingBox(mesh);

            const filename = e.target.files[0].name;

            const buffer = localStorage.getItem(LOCALSTORAGE_KEY_GLTF_IMPORTED);
            const bufferObject = buffer ? JSON.parse(buffer) : null;

            const placeAtCenterOfTheScreen = () => {
              if (confirm("Placer l'objet au milieu de l'écran ?")) {
                // to actually see it
                mesh.position.copy(pointCloudVisualizer.orbitControls.target); // <== place where user is looking
              }
            };

            if (bufferObject && bufferObject[filename]) {
              if (
                confirm(
                  'Une ancienne transformation trouvé pour ' +
                    filename +
                    ' appliquer ?'
                )
              ) {
                new THREE.Matrix4()
                  .fromArray(bufferObject[filename])
                  .decompose(mesh.position, mesh.quaternion, mesh.scale);
              } else {
                placeAtCenterOfTheScreen();
              }
            } else {
              placeAtCenterOfTheScreen();
            }
            mesh.name = filename;

            parentObject3D.add(mesh);

            updateObjectsList();

            selectTransformControls(mesh);

            pointCloudVisualizer.itownsView.notifyChange(
              pointCloudVisualizer.itownsView.camera.camera3D
            );
          })
          .catch((error) => console.error(error));
      };
    }
  }

  // layer visiblity + opacity
  const layerParams = [];
  pointCloudVisualizer.itownsView.getLayers().forEach((layer) => {
    if (layer.id == 'planar' || layer.isElevationLayer || layer.isColorLayer) {
      layerParams.push({ layer: layer });
    }
  });
  pointCloudVisualizer.pointCloudLayers.forEach((layer) => {
    layerParams.push({
      isPointCloud: true,
      layer: layer,
      defaultPointCloudSize: defaultPointCloudSize,
    });
  });
  const widgetLayerChoice = new LayerChoice(
    pointCloudVisualizer.itownsView,
    layerParams
  );
  settingsDetails.appendChild(widgetLayerChoice.domElement);

  // count points loaded
  {
    const pointCountDomElement = document.createElement('div');
    leftPanDomElement.appendChild(pointCountDomElement);
    pointCloudVisualizer.pointCloudLayers
      .filter((el) => el.object3d.userData.isPointCloud)
      .forEach((c3dTilesLayer) => {
        c3dTilesLayer.addEventListener(
          itowns.C3DTILES_LAYER_EVENTS.ON_TILE_CONTENT_LOADED,
          () => {
            let count = 0;

            pointCloudVisualizer.pointCloudLayers.forEach((layer) => {
              layer.object3d.traverse((child) => {
                if (child.isPoints && child.geometry) {
                  count += child.geometry.attributes.position.count;
                }
              });
            });

            pointCountDomElement.innerText = numberToLabel(count) + ' points';
          }
        );
      });
  }

  // conversation 3D
  {
    const conversation3DDetails = createLocalStorageDetails(
      'conversation_details',
      'Conversation',
      leftPanDomElement
    );
    conversation3DDetails.classList.add('list_conversation3D');

    const iconContainer = document.createElement('div');
    iconContainer.classList.add('conversation3D_icon_container');
    conversation3DDetails.appendChild(iconContainer);

    const conversation3DMaterial = new THREE.MeshBasicMaterial({
      color: 'yellow',
    });

    // conversation 3D on click display conversation
    const conversationDisplayerContainer = document.createElement('div');
    conversationDisplayerContainer.classList.add('conversation_container');
    conversationDisplayerContainer.hidden = true;
    conversation3DDetails.appendChild(conversationDisplayerContainer);

    const commentsDomElement = document.createElement('div');

    let openedConversation = null;

    /** @type {Array<Comment>} */
    let currentComments = [];

    class Comment {
      constructor(json) {
        this.uuid = json.comment.uuid;

        this.createdAt = new Date(json.comment.createdAt);

        this.text = json.comment.text;

        this.userUUID = json.comment.user_uuid;

        this.userNickname = json.comment.user_nickname;

        /** INIT DOMELEMENT */

        // dom element
        this.domElement = document.createElement('div');
        this.domElement.classList.add('comment_container');

        // text
        const textDomElement = document.createElement('p');
        textDomElement.innerHTML = urlify(this.text);
        this.domElement.appendChild(textDomElement);

        // edit text
        const editTextDomElement = document.createElement('textarea');
        editTextDomElement.hidden = true;
        this.domElement.appendChild(editTextDomElement);

        // images
        const imageContainersDomElement = document.createElement('div');
        this.domElement.appendChild(imageContainersDomElement);

        const imageContainers = [];

        json.commentImages.forEach((commentImage) => {
          const container = new ImageContainer(
            commentImage.path,
            commentImage.uuid
          );
          imageContainers.push(container);
          imageContainersDomElement.appendChild(container.domElement);
        });

        // date creattion
        const infoLabel = document.createElement('div');
        infoLabel.classList.add('comment_date_label');
        infoLabel.innerText =
          this.createdAt.toString() + ' - ' + this.userNickname;
        this.domElement.appendChild(infoLabel);

        if (
          user.role == constants.user.role.admin ||
          user.uuid == this.userUUID
        ) {
          // delete comment button
          const deleteButton = document.createElement('button');
          deleteButton.innerText = 'Supprimer';
          this.domElement.appendChild(deleteButton);

          deleteButton.onclick = () => {
            if (confirm('Supprimer ?')) {
              request(
                window.location.origin +
                  constants.endPoint.galeri3.deleteComment +
                  '/' +
                  this.uuid
              ).catch((error) => console.info(error));
            }
          };

          // edit comment
          const editButton = document.createElement('button');
          editButton.innerText = 'editer';
          this.domElement.appendChild(editButton);

          // send edited comment
          const sendEditedCommentButton = document.createElement('button');
          sendEditedCommentButton.innerText = 'Savegarder modification';
          this.domElement.appendChild(sendEditedCommentButton);
          sendEditedCommentButton.hidden = true;

          sendEditedCommentButton.onclick = () => {
            request(
              window.location.origin +
                constants.endPoint.galeri3.updateComment +
                '/' +
                this.uuid,
              { text: editTextDomElement.value }
            ).then(() => {
              // force refresh this
              this.dispose();
              currentComments = currentComments.filter(
                (el) => el.uuid != this.uuid
              );
            });
          };

          editButton.onclick = () => {
            if (editTextDomElement.hidden) {
              editTextDomElement.hidden = false;
              sendEditedCommentButton.hidden = false;
              textDomElement.hidden = true;
              editTextDomElement.value = unUrlify(textDomElement.innerHTML);
              editButton.innerText = 'annuler';
            } else {
              editTextDomElement.hidden = true;
              sendEditedCommentButton.hidden = true;
              textDomElement.hidden = false;
              editButton.innerText = 'editer';
            }
          };

          // add remove image button on image
          imageContainers.forEach((c) => {
            const deleteImageButton = document.createElement('button');
            deleteImageButton.innerText = 'Supprimer';
            c.domElement.appendChild(deleteImageButton);

            deleteImageButton.onclick = () => {
              if (confirm('Supprimer')) {
                request(
                  window.location.origin +
                    constants.endPoint.galeri3.deleteCommentImage +
                    '/' +
                    c.uuid
                ).then(() => {
                  // force refresh this
                  this.dispose();
                  currentComments = currentComments.filter(
                    (el) => el.uuid != this.uuid
                  );
                });
              }
            };
          });
        }
      }

      dispose() {
        this.domElement.remove();
      }
    }

    const updateCommentsOpenedConversation = () => {
      if (!openedConversation) {
        return;
      }

      const previousConversation = openedConversation;

      request(
        window.location.origin +
          constants.endPoint.galeri3.pullConversation3DCommentMap +
          '/' +
          openedConversation.uuid
      )
        .then((maps) => {
          if (!maps || previousConversation !== openedConversation) return; // conversation has changed

          maps.forEach((map) => {
            const comment = currentComments.filter(
              (c) => c.uuid === map.commentUUID
            );

            if (comment.length) {
              // already there
            } else {
              // should be pull

              request(
                window.location.origin +
                  constants.endPoint.galeri3.pullComment +
                  '/' +
                  map.commentUUID
              )
                .then((c) => {
                  if (previousConversation !== openedConversation) return; // conversation has changed

                  const alreadyAdd = currentComments.filter(
                    (el) => el.uuid == c.uuid
                  );
                  if (alreadyAdd.length) return;

                  // add in current comments
                  currentComments.push(new Comment(c));

                  // reorder domElement in comments
                  while (commentsDomElement.firstChild)
                    commentsDomElement.firstChild.remove();

                  currentComments.sort((a, b) => a.createdAt - b.createdAt);
                  currentComments.forEach((c) =>
                    commentsDomElement.appendChild(c.domElement)
                  );
                })
                .catch((error) => console.info('comment error ', error));
            }
          });

          // remove comments deleted
          for (let index = currentComments.length - 1; index >= 0; index--) {
            const c = currentComments[index];
            const inMap = maps.filter((el) => el.commentUUID === c.uuid);
            if (!inMap.length) {
              c.dispose();
              currentComments.splice(index, 1);
            }
          }
        })
        .catch((error) => console.info(error));
    };
    setInterval(updateCommentsOpenedConversation, 1000);

    const openConversation3D = (c) => {
      if (!c) {
        conversationDisplayerContainer.hidden = true;
        openedConversation = null;
        return;
      }
      openedConversation = c;

      // reset
      currentComments.length = 0;
      conversationDisplayerContainer.hidden = false;
      while (conversationDisplayerContainer.firstChild) {
        conversationDisplayerContainer.firstChild.remove();
      }
      while (commentsDomElement.firstChild)
        commentsDomElement.firstChild.remove();

      // name
      const labelName = document.createElement('div');
      labelName.innerText = 'Name: ' + c.name;
      conversationDisplayerContainer.appendChild(labelName);

      // move to button
      const moveToButton = document.createElement('button');
      moveToButton.innerText = 'aller voir';
      conversationDisplayerContainer.appendChild(moveToButton);

      moveToButton.onclick = () => {
        pointCloudVisualizer.moveCamera(c.cameraPosition, c.object3D.position);
      };

      // close button
      const closeButton = document.createElement('button');
      closeButton.innerText = 'fermer';
      conversationDisplayerContainer.appendChild(closeButton);

      closeButton.onclick = () => openConversation3D(null);

      // uuid
      const labelUUID = document.createElement('div');
      labelUUID.innerText = 'UUID: ' + c.uuid;
      conversationDisplayerContainer.appendChild(labelUUID);

      // position
      const labelPosition = document.createElement('div');
      labelPosition.innerText =
        'Position: ' + vector3ToLabel(c.object3D.position);
      conversationDisplayerContainer.appendChild(labelPosition);

      // creation date
      const labelCreation = document.createElement('div');
      labelCreation.innerText = 'Date: ' + new Date(c.createdAt).toString();
      conversationDisplayerContainer.appendChild(labelCreation);

      // user nickname
      const labelUserNickname = document.createElement('div');
      labelUserNickname.innerText =
        'Conversation 3D created by ' + c.userNickname;
      conversationDisplayerContainer.appendChild(labelUserNickname);

      // comments container
      conversationDisplayerContainer.appendChild(commentsDomElement);

      // add comment div
      const createCommentContainer = document.createElement('div');
      conversationDisplayerContainer.appendChild(createCommentContainer);

      // text area comment
      const textAreaComment = document.createElement('textarea');
      createCommentContainer.appendChild(textAreaComment);

      // images
      const imagesAddedContainer = document.createElement('div');
      imagesAddedContainer.classList.add('added_comment_images');
      createCommentContainer.appendChild(imagesAddedContainer);

      const imageContainers = [];

      const addImageElement = createLabelInput('Ajouter une image', 'file');
      addImageElement.input.accept = 'image/*';
      createCommentContainer.appendChild(addImageElement.parent);

      addImageElement.input.onchange = (e) => {
        readSingleFileAsDataUrl(e, (data) => {
          const imageContainer = new ImageContainer(data.target.result);
          imagesAddedContainer.appendChild(imageContainer.domElement);
          imageContainers.push(imageContainer);

          const deleteButton = document.createElement('button');
          deleteButton.innerText = 'Supprimer';
          deleteButton.onclick = () => {
            if (confirm('Supprimer ?')) {
              imageContainer.domElement.remove();
              removeFromArray(imageContainers, imageContainer);
            }
          };

          imageContainer.domElement.appendChild(deleteButton);
        });
      };

      if (user.role == constants.user.role.admin || user.uuid == c.userUUID) {
        // delete button
        const deleteConversationButton = document.createElement('button');
        deleteConversationButton.innerText = 'Supprimer conversation 3D';
        conversationDisplayerContainer.appendChild(deleteConversationButton);
        deleteConversationButton.onclick = () => {
          if (confirm('Supprimer ?')) {
            request(
              window.location.origin +
                constants.endPoint.galeri3.deleteConversation3D +
                '/' +
                c.uuid
            );

            conversationDisplayerContainer.hidden = true;
          }
        };
      }

      // post
      const addButton = document.createElement('button');
      addButton.innerText = 'Ajouter commentaire';
      createCommentContainer.appendChild(addButton);

      addButton.onclick = () => {
        const dataURIS = [];

        imageContainers.forEach((container) => {
          dataURIS.push(container.image.src);
          container.domElement.remove();
        });

        imageContainers.length = 0;

        request(
          window.location.origin + constants.endPoint.galeri3.createComment,
          {
            conversation3DUUID: c.uuid,
            text: textAreaComment.value,
            dataURIS: dataURIS,
          }
        ).catch((error) => console.info(error));

        textAreaComment.value = ''; // reset
      };
    };

    class Conversation3D {
      constructor(json) {
        this.uuid = json.uuid;

        this.name = json.name;

        this.userNickname = json.user_nickname;

        this.userUUID = json.user_uuid;

        this.cameraPosition = new THREE.Vector3().fromArray(
          json.camera_position.split(',').map((el) => parseFloat(el))
        );

        this.object3D = new THREE.Mesh(
          new THREE.BoxGeometry(),
          conversation3DMaterial
        );
        this.object3D.position.fromArray(
          json.position.split(',').map((el) => parseFloat(el))
        );
        this.updateObject3DScale();

        this.createdAt = json.createdAt;

        pointCloudVisualizer.topScene.add(this.object3D);

        this.domElement = document.createElement('div');
        this.domElement.classList.add('icon_conversation3D');
        this.domElement.title = this.name;
        this.domElement.onclick = () => openConversation3D(this);

        const image = document.createElement('img');
        image.src = json.image_path;
        this.domElement.appendChild(image);

        const title = document.createElement('div');
        title.classList.add('icon_conversation3D_title');
        title.innerText = this.name;
        this.domElement.appendChild(title);

        iconContainer.appendChild(this.domElement);
      }

      dispose() {
        pointCloudVisualizer.topScene.remove(this.object3D);
        this.domElement.remove();

        if (this == openedConversation) openConversation3D(null);

        // should be GC since nothing reference it
      }

      updateObject3DScale() {
        const scale =
          pointCloudVisualizer.itownsView.camera.camera3D.position.distanceTo(
            this.object3D.position
          ) / 100;
        this.object3D.scale.set(scale, scale, scale);
      }
    }

    /** @type {Array<Conversation3D>} */
    const conversation3DArray = [];

    pointCloudVisualizer.itownsView.addFrameRequester(
      itowns.MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE,
      () => {
        conversation3DArray.forEach((c) => {
          c.updateObject3DScale();
        });
      }
    );

    const updateConversation3DFromBackend = () => {
      request(
        window.location.origin + constants.endPoint.galeri3.pullConversation3D
      ).then((currentConversation3DJsonArray) => {
        if (!currentConversation3DJsonArray) return;

        // update
        conversation3DArray.forEach((c) => {
          const current = currentConversation3DJsonArray.filter(
            (el) => el.uuid === c.uuid
          );
          if (current.length) {
            if (current.length != 1) throw new Error('duplicated conversation');
            // update nothing for now
            // clear it
            currentConversation3DJsonArray.splice(
              currentConversation3DJsonArray.indexOf(current[0]),
              1
            );
          } else {
            // have been deleted
            c.dispose();
          }
        });

        // others remaining are new conversation
        currentConversation3DJsonArray.forEach((json) => {
          conversation3DArray.push(new Conversation3D(json));
        });
        pointCloudVisualizer.itownsView.notifyChange(
          pointCloudVisualizer.itownsView.camera.camera3D
        );
      });
    };

    const createConversationDomElement = document.createElement('button');
    createConversationDomElement.innerText = 'Creer conversation';
    conversation3DDetails.appendChild(createConversationDomElement);

    createConversationDomElement.onclick = () => {
      const menu = document.createElement('div');
      menu.classList.add('centered_container');
      domElementUI.appendChild(menu);

      const nameInput = document.createElement('input');
      nameInput.setAttribute('type', 'text');
      menu.appendChild(nameInput);

      nameInput.focus();

      const cancelButton = document.createElement('button');
      cancelButton.innerText = 'cancel';
      menu.appendChild(cancelButton);
      cancelButton.onclick = () => menu.remove();

      const validateButton = document.createElement('button');
      validateButton.innerText = 'validate';
      menu.appendChild(validateButton);
      validateButton.onclick = () => {
        pointCloudVisualizer.itownsView.render();

        request(
          window.location.origin +
            constants.endPoint.galeri3.createConversation3D,
          {
            position: pointCloudVisualizer.orbitControls.target
              .toArray()
              .toString(),
            cameraPosition:
              pointCloudVisualizer.itownsView.camera.camera3D.position
                .toArray()
                .toString(),
            name: nameInput.value,
            dataURI: renderer.domElement.toDataURL(),
          }
        ).catch((error) => console.info(error));

        menu.remove();
      };
    };

    pointCloudVisualizer.domElement.addEventListener('click', (event) => {
      pointCloudVisualizer.raycaster.setFromCamera(
        pointCloudVisualizer.eventToMouseCoord(event),
        pointCloudVisualizer.itownsView.camera.camera3D
      );

      // conversation 3D

      const minDist = Infinity;
      let conversationClicked = null;

      conversation3DArray.forEach((m) => {
        const intersects = pointCloudVisualizer.raycaster.intersectObject(
          m.object3D
        );
        if (intersects.length && intersects[0].distance < minDist) {
          conversationClicked = m;
        }
      });

      if (conversationClicked) openConversation3D(conversationClicked);
    });

    // update conversation 3D every second
    setInterval(updateConversation3DFromBackend, 1000);
  }

  // bookmark
  {
    const bookmarkDetails = createLocalStorageDetails(
      'bookmark_details',
      'Camera points de vues',
      settingsDetails
    );
    const bookmark = new Bookmark(pointCloudVisualizer.itownsView);
    bookmarkDetails.appendChild(bookmark.domElement);
  }

  // DEBUG PRINT
  window.addEventListener('keydown', (event) => {
    if (event.key == 'p') {
      console.log(pointCloudVisualizer.orbitControls);
      console.log(pointCloudVisualizer.topScene);
      console.log(pointCloudVisualizer);
    }
  });
};
