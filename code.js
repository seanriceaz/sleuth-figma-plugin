// This plugin will scan the layers in the ope file to determine how many of them
// are library components, library text, or library colors
/*
let remoteComponentIds = new Set();
let localPaintStyleIds = new Set();
let localTextStyleIds = new Set();
*/
const counts = {
    layers: 0,
    layersReferencingRemoteComponents: 0,
    layersReferencingRemotePaintStyles: 0,
    layersReferencingRemoteTextStyles: 0,
    layersReferencingRemoteAnyStyles: 0,
};
let badLayers = {};
const countLayers = (node, pageId) => {
    if (node.children && node.type != "INSTANCE") { // Stop traversing the tree when we've got a component instance
        node.children.forEach((layerNode, pageID) => {
            countLayers(layerNode, pageID);
        });
    }
    counts.layers++;
    if (node.type == "INSTANCE" && node.mainComponent.remote) {
        counts.layersReferencingRemoteComponents++;
        counts.layersReferencingRemoteAnyStyles++;
    }
    else if (node.styles) {
        var textGood = false;
        var colorGood = false;
        for (const style in node.styles) {
            const thisStyle = node.styles[style];
            if (thisStyle.remote) {
                textGood = true;
            }
            if (thisStyle.remote) {
                colorGood = true;
                if (node.type != "TEXT") {
                    textGood = true;
                }
            }
        }
        if (textGood && colorGood) {
            if (node.type == "TEXT") {
                counts.layersReferencingRemoteTextStyles++;
            }
            else {
                counts.layersReferencingRemotePaintStyles++;
            }
            counts.layersReferencingRemoteAnyStyles++;
        }
        else {
            badLayers[node.id] = {
                nodeId: node.id,
                pageId: pageId,
                type: node.type
            };
        }
    }
    return counts;
};
// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).
// This shows the HTML page in "ui.html".
figma.showUI(__html__);
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
        /*
        // Get all our remote component ids
        let remoteComponents = file.findAll(n => n.type==="COMPONENT" && n.remote);
        for (const component in remoteComponents){
          remoteComponentIds.add(remoteComponents[component].id);
        }
  
        // Get all our loca style ids
        let localPaints = figma.getLocalPaintStyles();
        for (const paint in localPaints){
          localPaintStyleIds.add(localPaints[paint].id);
        }
  
        let localTextStyles = figma.getLocalTextStyles();
        for (const style in localTextStyles){
          localTextStyleIds.add(localTextStyles[style].id);
        }
        */
        // Let's count the layers
        pages.forEach(page => {
            if (page) {
                countLayers(page, page.id);
            }
        });
        figma.ui.postMessage(Object.assign({ type: "doneLoading", badLayers: badLayers }, counts));
    }
    if (msg.type === 'Sleuth-Select') {
    }
    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
};
