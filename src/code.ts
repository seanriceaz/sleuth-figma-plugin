// This plugin will scan the layers in the open file to determine how many of them
// are library components, library text, or library colors

const counts = {
  layers: 0,
  textLayers: 0,
  paintLayers: 0,
  layersReferencingRemoteComponents: 0,
  layersReferencingRemotePaintStyles: 0,
  layersReferencingRemoteTextStyles: 0,
  layersReferencingRemoteAnyStyles: 0,
  fixedStyles: -1,
};

const remotePaints = {};
let remotePaintKeys = [];
const remoteType = {};
let remoteTypeKeys = [];

const matchRemoteId = /\,.+:.+/;

let badLayers = {};

const countLayers = (node, pageId) => {
  if (node.children && node.type != "INSTANCE" && node.type != "BOOLEAN_OPERATION") { // Stop traversing the tree when we've got a component instance or boolean
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
        badLayerComment = "Mixed Styles";
      } else if (node.textStyleId && node.fillStyleId) {
        if (node.textStyleId.match(matchRemoteId) && node.fillStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemoteAnyStyles++;
          counts.layersReferencingRemoteTextStyles++;

          remotePaints[node.fillStyleId] = figma.getStyleById(node.fillStyleId); // Store this node's fill style for autofixing other layers
          remoteType[node.textStyleId] = figma.getStyleById(node.textStyleId); // Store this node's text style for autofixing other layers
        } else if (node.textStyleId.match(matchRemoteId)) {
          badLayerComment = "Use a library color";
          remoteType[node.textStyleId] = figma.getStyleById(node.textStyleId); // Store this node's text style for autofixing other layers
        } else if (node.fillStyleId.match(matchRemoteId)) {
          badLayerComment = "Use a library text style";
          remotePaints[node.fillStyleId] = figma.getStyleById(node.fillStyleId); // Store this node's fill style for autofixing other layers
        } else {
          badLayerComment = "Use library text style and color";
        }
      } else if (node.textStyleId) {
        if (node.textStyleId.match(matchRemoteId)) {
          badLayerComment = "Use a library color";
          remoteType[node.textStyleId] = figma.getStyleById(node.textStyleId); // Store this node's text style for autofixing other layers
        } else {
          badLayerComment = "Use library text style and color";
        }
      } else if (node.fillStyleId) {
        if (node.fillStyleId.match(matchRemoteId)) {
          badLayerComment = "Use a library text style";
          remotePaints[node.fillStyleId] = figma.getStyleById(node.fillStyleId); // Store this node's fill style for autofixing other layers
        } else {
          badLayerComment = "Use library text style and color";
        }
      } else {
        badLayerComment = "Use library text style and color";
      }
    } else if (node.fills || node.strokes) {
      counts.paintLayers++;

      if (node.fills == figma.mixed || node.strokes == figma.mixed) {
        badLayerComment = "Mixed styles";
      } else if (node.fills.length >0 && node.strokes.length >0) {
        if (node.fillStyleId.match(matchRemoteId) && node.strokeStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemotePaintStyles++;
          counts.layersReferencingRemoteAnyStyles++;

          remotePaints[node.fillStyleId] = figma.getStyleById(node.fillStyleId); // Store this node's fill style for autofixing other layers
          remotePaints[node.strokeStyleId] = figma.getStyleById(node.strokeStyleId); // Store this node's stroke style for autofixing other layers
        } else if (node.strokeStyleId.match(matchRemoteId)) {
          badLayerComment = "Use a library fill";
          remotePaints[node.strokeStyleId] = figma.getStyleById(node.strokeStyleId); // Store this node's stroke style for autofixing other layers
        } else if (node.fillStyleId.match(matchRemoteId)) {
          badLayerComment = "Use a library stroke";
          remotePaints[node.fillStyleId] = figma.getStyleById(node.fillStyleId); // Store this node's fill style for autofixing other layers
        } else {
          badLayerComment = "Use library fill and stroke";
        }
      } else if (node.fills.length >0) {
        if (node.fillStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemotePaintStyles++;
          counts.layersReferencingRemoteAnyStyles++;
          remotePaints[node.fillStyleId] = figma.getStyleById(node.fillStyleId); // Store this node's fill style for autofixing other layers
        } else {
          badLayerComment = "Use a library fill";
        }
      } else if (node.strokes.length >0) {
        if (node.strokeStyleId.match(matchRemoteId)) {
          counts.layersReferencingRemotePaintStyles++;
          counts.layersReferencingRemoteAnyStyles++;
          remotePaints[node.strokeStyleId] = figma.getStyleById(node.strokeStyleId); // Store this node's stroke style for autofixing other layers
        } else {
          badLayerComment = "Use a library stroke";
        }
      } else {
        // No fill or stroke at all. Usually this is a frame for layout only.
        badLayerComment = "";
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

function clone(val) {
  const type = typeof val
  if (val === null) {
    return null
  } else if (type === 'undefined' || type === 'number' ||
             type === 'string' || type === 'boolean') {
    return val
  } else if (type === 'object') {
    if (val instanceof Array) {
      return val.map(x => clone(x))
    } else if (val instanceof Uint8Array) {
      return new Uint8Array(val)
    } else {
      let o = {}
      for (const key in val) {
        o[key] = clone(val[key])
      }
      return o
    }
  }
  throw 'unknown'
}

const samePaints = (paintA, paintB) => {
  this.same = true;
  if (paintA.length == paintB.length)
  {
    for(let i=0; i < paintA.length; i++ )
    {
      if (paintA[i].type == paintB[i].type)
      {
        let type = paintA[i].type;
        if (type.indexOf("GRADIENT") >= 0) {
          type = "GRADIENT";
        }
        switch (type) {
          case "SOLID":
            if ( paintA[i].opacity != paintB[i].opacity ||
              paintA[i].blendMode != paintB[i].blendMode ||
              paintA[i].color.r != paintB[i].color.r ||
              paintA[i].color.g != paintB[i].color.g ||
              paintA[i].color.b != paintB[i].color.b)
            {
              this.same = false;
            }
          break;
          case "GRADIENT":
            if ( paintA[i].opacity != paintB[i].opacity ||
              paintA[i].blendMode != paintB[i].blendMode ||
              paintA[i].gradientTransform != paintB[i].gradientTransform ||
              paintA[i].gradientStops.length != paintB[i].gradientStops.length)
            {
              this.same = false;
            } else {

              for (let stop = 0; stop < paintA[i].gradientStops.length; stop++){
                if (paintA[i].gradientStops[stop].position != paintB[i].gradientStops[stop].position ||
                  paintA[i].gradientStops[stop].color.a != paintB[i].gradientStops[stop].color.a ||
                  paintA[i].gradientStops[stop].color.r != paintB[i].gradientStops[stop].color.r ||
                  paintA[i].gradientStops[stop].color.g != paintB[i].gradientStops[stop].color.g ||
                  paintA[i].gradientStops[stop].color.b != paintB[i].gradientStops[stop].color.b)
                {
                  this.same = false;
                }
              }
            }
            break;
          case "IMAGE":
            if ( paintA[i].opacity != paintB[i].opacity ||
              paintA[i].blendMode != paintB[i].blendMode ||
              paintA[i].scaleMode != paintB[i].scaleMode ||
              paintA[i].imageTransform != paintB[i].imageTransform ||
              paintA[i].scalingFactor != paintB[i].scalingFactor ||
              paintA[i].imageHash != paintB[i].imageHash ||
              paintA[i].filters.exposure != paintB[i].filters.exposure ||
              paintA[i].filters.contrast != paintB[i].filters.contrast ||
              paintA[i].filters.saturation != paintB[i].filters.saturation ||
              paintA[i].filters.temperature != paintB[i].filters.temperature ||
              paintA[i].filters.tint != paintB[i].filters.tint ||
              paintA[i].filters.highlights != paintB[i].filters.highlights ||
              paintA[i].filters.shadows != paintB[i].filters.shadows)
            {
              this.same = false;
            }
            break;
          default:
            this.same = false;
          break;
        }
      } else {
        this.same = false;
      }
    }
  } else {
    this.same = false;
  }
  return this.same;
}

const fixLayers = (pages) => {
  counts.fixedStyles = 0;
  this.pageKeys = Object.keys(pages);
  for (let pageKey = 0; pageKey < this.pageKeys.length; pageKey++)
  {
    console.log("page: " + this.pageKeys[pageKey]);
    const layerKeys = Object.keys(pages[this.pageKeys[pageKey]].layers);
    console.log ("layers: " + layerKeys.length);
    for (let layerKey = 0; layerKey < layerKeys.length; layerKey++)
    {
      this.nodeId = pages[this.pageKeys[pageKey]].layers[layerKeys[layerKey]].nodeId;
      console.log("node ID: " + this.nodeId + " count: " + layerKey);
      fixTextStyle(this.nodeId);
      fixFillStyle(this.nodeId);
      fixStrokeStyle(this.nodeId);
    }
  }
}

const fixTextStyle = (nodeId) => {
  // Compare this text style to known remote text styles
  this.skip = false;
  this.node = figma.getNodeById(nodeId);
  if (this.node.type == "TEXT"){
    if (typeof(this.node.textStyleId) === "string") {
      if (this.node.textStyleId.match(matchRemoteId)) {
        this.skip = true;
      }
    }

    if (!this.node.hasMissingFont && !this.skip) {
      for (let typeStyleKey = 0; typeStyleKey < remoteTypeKeys.length; typeStyleKey++ ) {
        const style = remoteType[remoteTypeKeys[typeStyleKey]];
        if(this.node.fontName !== figma.mixed && this.node.lineHeight !== figma.mixed && this.node.letterSpacing !== figma.mixed)
        {
          if (this.node.fontName.family == style.fontName.family &&
              this.node.fontName.style == style.fontName.style &&
              this.node.fontSize == style.fontSize &&
              this.node.lineHeight.unit == style.lineHeight.unit &&
              this.node.paragraphSpacing == style.paragraphSpacing &&
              this.node.paragraphIndent == style.paragraphIndent &&
              this.node.letterSpacing.unit == style.letterSpacing.unit &&
              this.node.letterSpacing.value == style.letterSpacing.value)
          {
            if (this.node.lineHeight.unit == "AUTO" || this.node.lineHeight.value == style.lineHeight.value){
              this.node.textStyleId = style.id;
              counts.fixedStyles ++;
              break;
            }
          }
        }
      }
    }
  }
}

const fixFillStyle = (nodeId) => {
  // Remove default blank background
  this.skip = false;
  this.node = figma.getNodeById(nodeId);
  if (this.node.type != "GROUP"  && this.node.type != "DOCUMENT" && this.node.type != "PAGE" && this.node.type != "INSTANCE" && this.node.type != "SLICE"){

    if (typeof(this.node.fillStyleId) === "string") {
      if (this.node.fillStyleId.match(matchRemoteId)) {
        this.skip = true;
      }
    }
    if (this.node.fills !== figma.mixed){
      if (this.node.fills.length > 0 && !this.skip) {
        if (!this.node.fills[0].visible &&
          this.node.fills[0].type=="SOLID" &&
          this.node.fills[0].color.r == 1 &&
          this.node.fills[0].color.g == 1 &&
          this.node.fills[0].color.b == 1 &&
          this.node.fills[0].opacity == 1) {
            const tempFills = clone(this.node.fills);
            tempFills.splice(0,1);
            this.node.fills = tempFills;
            counts.fixedStyles ++;
          }

        // Compare this fill style to known remote styles
        for (let fillKey = 0; fillKey < remotePaintKeys.length; fillKey++) {
          const style = remotePaints[remotePaintKeys[fillKey]].paints;
          if ( samePaints(this.node.fills, style ) ) {
            this.node.fillStyleId = remotePaints[remotePaintKeys[fillKey]].id;
            counts.fixedStyles ++;
            break;
          }
        }
      }
    }
  }
}

const fixStrokeStyle = (nodeId) => {

  this.skip = false;
  this.node = figma.getNodeById(nodeId);
  if (this.node.type != "GROUP"  && this.node.type != "DOCUMENT" && this.node.type != "PAGE" && this.node.type != "INSTANCE" && this.node.type != "SLICE"){
    if (typeof(this.node.strokeStyleId) === "string") {
      if (this.node.strokeStyleId.match(matchRemoteId)) {
        this.skip = true;
      }
    }

    if (this.node.strokes.length > 0 && !this.skip) {
      for (let strokeKey = 0; strokeKey < remotePaintKeys.length; strokeKey++){
        const style = remotePaints[remotePaintKeys[strokeKey]].paints;
        if ( samePaints(this.node.strokes, style ) ){
          this.node.strokeStyleId = remotePaints[remotePaintKeys[strokeKey]].id;
          counts.fixedStyles ++;
          break;
        }
      }
    }
  }
}


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
    if (msg.type === 'Sleuth-Count' || msg.type === 'Sleuth-Autofix') {
      // First, reset the counts and pointers

      let file = figma.root;
      let pages = [...file.children];

      if (msg.type === 'Sleuth-Autofix') {
        remoteTypeKeys = Object.keys(remoteType);
        remotePaintKeys = Object.keys(remotePaints);
        fixLayers (badLayers);
      } else {
        counts.fixedStyles = -1;
      }

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
      figma.viewport.scrollAndZoomIntoView(selection);
    }
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  if (msg.type === 'done') {
    figma.closePlugin();
  }
};