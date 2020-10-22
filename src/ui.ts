import 'figma-plugin-ds/dist/figma-plugin-ds.css';
import './ui.css';

import { disclosure } from 'figma-plugin-ds';

onmessage = (event) => {
  const message = event.data.pluginMessage;
  if ( message.type === "doneLoading"){
    console.log(message);
    // Overall
    document.getElementById('overallCoverage').innerHTML = (Math.round( (message.layersReferencingRemoteAnyStyles/message.layers) * 1000 ) / 10).toString(10) + "%";
    document.getElementById('overallCount').innerHTML = `${message.layersReferencingRemoteAnyStyles} / ${message.layers} layers`;
    // Text
    document.getElementById('typeCoverage').innerHTML = (Math.round( (message.layersReferencingRemoteTextStyles/message.textLayers) * 1000 ) / 10).toString(10) + "%";
    document.getElementById('typeCount').innerHTML = `${message.layersReferencingRemoteTextStyles} / ${message.textLayers} layers`;
    // Color
    document.getElementById('colorCoverage').innerHTML = (Math.round( (message.layersReferencingRemotePaintStyles/message.paintLayers) * 1000 ) / 10).toString(10) + "%";
    document.getElementById('colorCount').innerHTML = `${message.layersReferencingRemotePaintStyles} / ${message.paintLayers} layers`;
    // Swap hidden
    document.getElementById("loading").className="hidden";
    document.getElementById("afterLoaded").className="";

    const pages = Object.keys(message.badLayers);
    // Set up disclosure panels

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
                        <span class="type type--small type--bold">${thisLayer.name}</span> - <span class="type type--small">${thisLayer.comment}</span>
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
};

document.getElementById('Run').onclick = () => {
  document.getElementById("loading").className="";
  document.getElementById("afterLoaded").className="hidden";
  parent.postMessage({ pluginMessage: { type: 'Sleuth-Count' } }, '*');
}

const selectNode = (pageId, layerId) => {
  parent.postMessage({ pluginMessage: { type: 'Sleuth-Select', pageId: pageId, layerId: layerId } }, '*');
}

const initializeClicks = () => {
  const addClicksTo = document.querySelectorAll(".select-node");

  for (const item in addClicksTo){
    if (addClicksTo[item] instanceof Element){
      addClicksTo[item].addEventListener( "click", (event) => {
        console.log(event.currentTarget);
        if ( event.currentTarget instanceof HTMLElement){
          const thisPage = event.currentTarget.getAttribute('data-page');
          const thisLayer = event.currentTarget.getAttribute('data-layer');
          selectNode( thisPage, thisLayer );
        } else {
          console.log("invalid selection");
        }
      }, false);
    }
  }
}

/*
document.getElementById('select').onclick = () => {
  ids = []; // Get selected rows here
  parent.postMessage({ pluginMessage: { type: 'Sleuth-Select', ids } }, '*')
}
*/

parent.postMessage({ pluginMessage: { type: 'Sleuth-Count' } }, '*');