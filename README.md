# Figma Plugin for Sleuth

Figma plugin to improve Design System usage in Figma files.

It works just like the [Sleuth report generator tool](https://github.com/infusionsoft/sleuth-sketch), but inside Figma, and only one file at a time. This helps you address issues problematic files easily.

## How to use

1. With a Figma file open, select Sleuth from the plugin menu.
2. Sleuth will scan your file for usage of external libraries.
3. When it's done, you get a percentage and a breakdown of "coverage"
4. You can then expand the pages
5. From there, you can select layers to update with external library references, increasing your coverage

## How coverage is calculated

Sleuth counts all layers drilling into groups and frames until it encounters a *Component reference, text node, or shape*.
These types of layers count towards the "covered" layers.

- Library components
- Text nodes using library text styles with library colors
- Other layers using a library color for a background or stroke

## Forking and building this plugin yourself

This is an open source plugin built mostly in javascript and HTML. If you want to modify the code for your own plugin, go for it (according to the MIT license).

1. Install [node.js](https://nodejs.org/en/)
2. Install typescript `npm install -g typescript`
3. In the Figma desktop app, go to Menu > Plugins > Development > New Plugin...
4. Point at your `manifest.json`
5. Make sure you update `manifest.json` with your new plugin id (if you have one) etc.
6. Edit the code in `/src`
7. Compile it with `npm run build`

## Changelog

1.0.0 - Release!
1.0.1 - Bug fixes
1.1.0 - Add autofixing feature