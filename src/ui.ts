import 'figma-plugin-ds/dist/figma-plugin-ds.css';
import './ui.css';

import { disclosure } from 'figma-plugin-ds';

// References to our toggling DOM elements
const loading = document.getElementById("loading");
const report = document.getElementById("afterLoaded");

// Setup all our functions

const loadSleuth = (message) => {
  // Setup our Stat display
  // Overall
  document.getElementById('overallCoverage').innerHTML = (Math.round( (message.layersReferencingRemoteAnyStyles/message.layers) * 1000 ) / 10).toString(10) + "%";
  document.getElementById('overallCount').innerHTML = `${message.layersReferencingRemoteAnyStyles} / ${message.layers} layers`;
  // Text
  document.getElementById('typeCoverage').innerHTML = (Math.round( (message.layersReferencingRemoteTextStyles/message.textLayers) * 1000 ) / 10).toString(10) + "%";
  document.getElementById('typeCount').innerHTML = `${message.layersReferencingRemoteTextStyles} / ${message.textLayers} layers`;
  // Color
  document.getElementById('colorCoverage').innerHTML = (Math.round( (message.layersReferencingRemotePaintStyles/message.paintLayers) * 1000 ) / 10).toString(10) + "%";
  document.getElementById('colorCount').innerHTML = `${message.layersReferencingRemotePaintStyles} / ${message.paintLayers} layers`;
  // Show them (and hide the loader)
  loading.className = "hidden";
  report.className = "";

  // Set up disclosure panels
  const pages = Object.keys(message.badLayers);

  let layerListHtml = "";
  for (const key in pages){
      let thisPage = message.badLayers[pages[key]];
      layerListHtml += `
      <li class="disclosure__item">
          <div class="disclosure__label disclosure--section">${thisPage.page.name}</div>
          <div class="disclosure__content">
              <ul class="layer-info">`;
      let layerKeys =  Object.keys(thisPage.layers);
      for (const layerKey in layerKeys){
          let thisLayer = thisPage.layers[layerKeys[layerKey]];
          layerListHtml += `
                  <li class="select-node" data-page="${thisPage.page.id}" data-layer="${thisLayer.nodeId}">
                      <span class="type type--xsmall type--bold">${thisLayer.name}</span> - <span class="type type--xsmall">${thisLayer.comment}</span>
                  </li>`;
      }
      layerListHtml += `
              </ul>
          </div>
      </li>`;
  }
  document.getElementById('page-select').innerHTML = layerListHtml;
  initializeClicks();
  disclosure.init();
}

const selectNode = (pageId, layerId) => {
  // Tell Figma to select the chosen node
  parent.postMessage({ pluginMessage: { type: 'Sleuth-Select', pageId: pageId, layerId: layerId } }, '*');
}

const initializeClicks = () => {
  // Add all the click events to select the nodes (must be done after HTML is rendered)
  const addClicksTo = document.querySelectorAll(".select-node");

  for (const item in addClicksTo){
    if (addClicksTo[item] instanceof Element){
      addClicksTo[item].addEventListener( "click", (event) => {
        if ( event.currentTarget instanceof HTMLElement){
          const thisPage = event.currentTarget.getAttribute('data-page');
          const thisLayer = event.currentTarget.getAttribute('data-layer');
          selectNode( thisPage, thisLayer );
        }
      }, false);
    }
  }
}

// Setup our initial events

onmessage = (event) => {
  // Handle messages from backend
  const message = event.data.pluginMessage;
  if ( message.type === "doneLoading"){
    loadSleuth(message);
  }
};

document.getElementById('Run').onclick = () => {
  // Handle clicks on the "Refresh" button
  loading.className = "";
  report.className = "hidden";

  parent.postMessage({ pluginMessage: { type: 'Sleuth-Count' } }, '*');
}

document.getElementById('Autofix').onclick = () => {
  // Handle clicks on the "Refresh" button
  loading.className = "";
  report.className = "hidden";

  parent.postMessage({ pluginMessage: { type: 'Sleuth-Autofix' } }, '*');
}

// Run the scan for the first time
parent.postMessage({ pluginMessage: { type: 'Sleuth-Count' } }, '*');
