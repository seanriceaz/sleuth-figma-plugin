// This plugin will scan the layers in the ope file to determine how many of them
// are library components, library text, or library colors

const counts = {
  layers: 0,
  textLayers: 0,
  paintLayers: 0,
  layersReferencingRemoteComponents: 0,
  layersReferencingRemotePaintStyles: 0,
  layersReferencingRemoteTextStyles: 0,
  layersReferencingRemoteAnyStyles: 0,
};

const matchRemoteId = /\,.+:.+/;

let badLayers = {};

const countLayers = (node, pageId) => {
  if (node.children && node.type != "INSTANCE") { // Stop traversing the tree when we've got a component instance
    node.children.forEach((layerNode) => {
      countLayers(layerNode, pageId);
    });
  }
  if (node.type != "GROUP"  && node.type != "DOCUMENT" && node.type != "PAGE") {
    counts.layers++;
    let badLayerComment = "";

    if (node.type == "INSTANCE" && node.mainComponent.remote) {
      counts.layersReferencingRemoteComponents++;
      counts.layersReferencingRemoteAnyStyles++;
    } else if (node.type == "TEXT"){
      counts.textLayers++;

      if (node.textStyleId == figma.mixed || node.fillStyleId == figma.mixed) {
        badLayerComment = "Mixed Text Styles";
      } else if (node.textStyleId && node.fillStyleId) {
        if (node.textStyleId.match(matchRemoteId) && node.fillStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemoteAnyStyles++;
          counts.layersReferencingRemoteTextStyles++;
        } else if (node.textStyleId.match(matchRemoteId)) {
          badLayerComment = "No remote color style";
        } else if (node.fillStyleId.match(matchRemoteId)) {
          badLayerComment = "No remote text style";
        } else {
          badLayerComment = "No remote text or color style";
        }
      } else if (node.textStyleId) {
        if (node.textStyleId.match(matchRemoteId)) {
          badLayerComment = "No remote text style";
        } else {
          badLayerComment = "No remote text or color style";
        }
      } else if (node.fillStyleId) {
        if (node.fillStyleId.match(matchRemoteId)) {
          badLayerComment = "No remote color style";
        } else {
          badLayerComment = "No remote text or color style";
        }
      } else {
        badLayerComment = "No remote text or color style";
      }
    } else if (node.fills || node.strokes) {
      counts.paintLayers++;

      if (node.fills == figma.mixed || node.strokes == figma.mixed) {
        badLayerComment = "Mixed stroke/fill styles";
      } else if (node.fills.length >0 && node.strokes.length >0) {
        if (node.fillStyleId.match(matchRemoteId) && node.strokeStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemotePaintStyles++;
          counts.layersReferencingRemoteAnyStyles++;
        } else if (node.strokeStyleId.match(matchRemoteId)) {
          badLayerComment = "No remote fill style";
        } else if (node.fillStyleId.match(matchRemoteId)) {
          badLayerComment = "No remote stroke style";
        } else {
          badLayerComment = "No remote fill or stroke style";
        }
      } else if (node.fills.length >0) {
        if (node.fillStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemotePaintStyles++;
          counts.layersReferencingRemoteAnyStyles++;
        } else {
          badLayerComment = "No remote fill style";
        }
      } else if (node.strokes.length >0) {
        if (node.strokeStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemotePaintStyles++;
          counts.layersReferencingRemoteAnyStyles++;
        } else {
          badLayerComment = "No remote stroke style";
        }
      } else {
        badLayerComment = "Empty layer?";
      }
    }
    if ( badLayerComment !== "") {
      badLayers[pageId].layers[node.id] = {
        nodeId: node.id,
        pageId: pageId,
        comment: badLayerComment,
        type: node.type,
        name: node.name
      }
    }
  }
  return counts;
};

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {width: 400, height: 600});

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
    if (msg.type === 'Sleuth-Count') {
      // First, reset the counts and pointers

      let file = figma.root;
      let pages = [...file.children];

      counts.layers = 0;
      counts.textLayers = 0;
      counts.paintLayers = 0;
      counts.layersReferencingRemoteComponents = 0;
      counts.layersReferencingRemotePaintStyles = 0;
      counts.layersReferencingRemoteTextStyles = 0;
      counts.layersReferencingRemoteAnyStyles = 0;
      badLayers = {};

      // Let's count the layers
      pages.forEach(page => {
        if (page) {
          badLayers[page.id] = {
            page: {
              id: page.id,
              name: page.name,
            },
            layers: {}
          };
          countLayers(page, page.id);
          console.log(badLayers[page.id]);
        }
    });

    //When we're done, kick it back to the UI.
    figma.ui.postMessage({
      type: "doneLoading",
      badLayers: badLayers,
      ...counts
    });
  }

  if (msg.type === 'Sleuth-Select') {
    const page = figma.getNodeById(msg.pageId);
    const selection = [];
    selection.push(figma.getNodeById(msg.layerId));
    if (page.type=="PAGE")
    {
      figma.currentPage = page;
      page.selection = selection;
    } else {
      console.log ("Not a page");
    }
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  if (msg.type === 'done') {
    figma.closePlugin();
  }
};


