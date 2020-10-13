# Figma Plugin for Sleuth

Figma plugin to improve Design System usage in Figma files.

It works just like the [Sleuth report generator tool](https://github.com/infusionsoft/sleuth-sketch), but inside Figma, and only one file at a time. This helps you address issues problematic files easily.

## How to use

1. With a Figma file open, select Sleuth from the plugin menu.
2. Sleuth will scan your file for usage of external libraries.
3. When it's done, you get a percentage and a breakdown of "coverage"
4. You can drill into individual breakdown points
5. From there, you can select layers to update with external library references, increasing your coverage

## How coverage is calculated

Sleuth counts all layers drilling into groups and frames until it encounters a *Component reference, text node, or shape*.
These types of layers count towards the "covered" layers.

- Library components
- Text nodes using library text styles with library colors
- Other layers using a library background style