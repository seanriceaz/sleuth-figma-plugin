import 'figma-plugin-ds/dist/figma-plugin-ds.css';
import './ui.css';

import { disclosure } from 'figma-plugin-ds';

onmessage = (event) => {
  const message = event.data.pluginMessage;
  if ( message.type === "doneLoading"){
    console.log(message);
    document.getElementById('overallCoverage').innerHTML = (Math.round( (message.layersReferencingRemoteAnyStyles/message.layers) * 1000 ) / 10).toString(10) + "%";
    document.getElementById("loading").className="hidden";
    document.getElementById("afterLoaded").className="";

    // Set up disclosure panels
    disclosure.init();
  }
};

document.getElementById('Run').onclick = () => {
  document.getElementById("loading").className="";
  document.getElementById("afterLoaded").className="hidden";
  parent.postMessage({ pluginMessage: { type: 'Sleuth-Count' } }, '*');
}

/*
document.getElementById('select').onclick = () => {
  ids = []; // Get selected rows here
  parent.postMessage({ pluginMessage: { type: 'Sleuth-Select', ids } }, '*')
}
*/

parent.postMessage({ pluginMessage: { type: 'Sleuth-Count' } }, '*');