# Geocam Viewer
Geocam shot viewer web component for displaying shots captured by a geocam rig.

## Live demo / GitHub Pages

The repository now ships with a ready-to-host `index.html` at the project root. Open the file
directly after running `npm run build`, or deploy the repository to GitHub Pages / Vercel and visit
`https://<your-domain>/index.html` to try the viewer together with the Depth Anything overlay.

### NPM Installation:
```
npm install 'https://gitpkg.now.sh/geocamxyz/geocam-viewer/src?v2.0.3'
```
or for a particual commit version:
```
npm install 'https://gitpkg.now.sh/geocamxyz/geocam-viewer/src?564ef82'
```
### Import Map (External Loading):
```
https://cdn.jsdelivr.net/gh/geocamxyz/geocam-viewer@v2.0.3/dist/geocam-viewer.js
```
or for a particual commit version:
```
https://cdn.jsdelivr.net/gh/geocamxyz/geocam-viewer@564ef82/dist/geocam-viewer.js
```

### Usage:
The .js file can be imported into your .html file using the below code (This can be ignored if your using the NPM package).
```
 <script type="module" src="https://cdn.jsdelivr.net/gh/geocamxyz/geocam-viewer@2.0.3/dist/geocam-viewer.js"></script>
 ```

 Or with an importmap
 ```
<script type="importmap">
      {
        "imports": {
          "geocam-viewer": "https://cdn.jsdelivr.net/gh/geocamxyz/geocam-viewer@2.0.3/dist/geocam-viewer.js"
        }
      }
    </script>
```
The viewer can then be imported via a module script or using the npm package and using the below import statement.
```
import "geocam-viewer"
```
### Setup:
The module generates a custom  &lt;geocam-viewer> html tag which can be used to display geocam captured shots.
```
 <geocam-viewer src="https://manager.geocam.xyz/6/1270/102.jpg" fov="35" facing="0" horizon="0"></geocam-viewer>
```

The following attributes define the shot and view to display:
- src="https://manager.geocam.xyz/6/1270/102.jpg" *shot url where the numbers are calibration id, source id and shot id respectively.  The URL is an attribute in the shots feature service*
- fov="35" *field of view - how zoomed in or our the display is*
- facing="0" *angle of view 0 will be north after shots have been processed 180 is south *
- horizon="0" *tilt of the view 0 is level, 90 is looking straight up -90 is straight down*

Updating any of these attributes will update the view.

By default the viewer will just display the image as described above.  You can enhance the viewer with the plugins described below.  More details for each plugin in their respective github repositories.
- [geocamxyz/plugin-orbit-controls](https://github.com/geocamxyz/plugin-orbit-controls) *allows the user to pan, tilt and zoom the viewer with mouse and keyboard controls*
- [geocamxyz/plugin-compass-needle](https://github.com/geocamxyz/plugin-compass-needle) *displays a compass needle on the viewer to indicate the current direction of view*
- [geocamxyz/plugin-label](https://github.com/geocamxyz/plugin-label) *adds a label to the viewer which can be used to display shot (or other) information*
- [geocamxyz/plugin-url-fragments](https://github.com/geocamxyz/plugin-url-fragments) *stores viewer state in the url hash so the address bar contents can be copied and loading that url will return the viewer to the exact same shot view (depending on the properties being tracked)*
- [geocamxyz/plugin-loading-indicator](https://github.com/geocamxyz/plugin-loading-indicator) *displays progress bars at the base of the viewer as the shot images are loading*
- [geocamxyz/plugin-screen-shot](https://github.com/geocamxyz/plugin-screen-shot) *adds a button to the viewer which will copy the current view as an image to the clipboard*
- [geocamxyz/plugin-prev-next-controls](https://github.com/geocamxyz/plugin-prev-next-controls) *adds a previous and next button to the viewer to display the previous and next shots in the capture*
- [geocamxyz/plugin-multiview-window](https://github.com/geocamxyz/plugin-multiview-window) *adds a control to the viewer for quickly resizing/moving the window around the screen particularly with respect to a map*
- [geocamxyz/connector-arcgis-map](https://github.com/geocamxyz/connector-arcgis-map) *connects the viewer to an instance of an arcgis javascript webmap to display the shots on the map and show them in the viewer when clicked*
- [geocamxyz/geocam-map](https://github.com/geocamxyz/geocam-map) *Not a plugin for the viewer itself but a handy custom tag to show an argis webmap that the viewer can be connected into*

A full implementation of the viewer including all the plugins would look like this:
```
  <geocam-viewer>
    <geocam-viewer-orbit-controls></geocam-viewer-orbit-controls>
    <geocam-viewer-compass-needle></geocam-viewer-compass-needle>
    <geocam-viewer-label></geocam-viewer-label>
    <geocam-viewer-url-fragments
      params="fov,facing,horizon,shot,sli,visible,left,top,width,height,mode,autorotate,autobrightness,zoom,center"></geocam-viewer-url-fragments>
    <geocam-viewer-loading-indicator></geocam-viewer-loading-indicator>
    <geocam-viewer-screen-shot></geocam-viewer-screen-shot>
    <geocam-viewer-prev-next-control></geocam-viewer-prev-next-control>
    <geocam-viewer-arcgis-map
      src="http://localhost:3092/arcgis/rest/services/0wlsvpg/FeatureServer"></geocam-viewer-arcgis-map>
    <geocam-viewer-multiview-window target="map"></geocam-viewer-multiview-window>
  </geocam-viewer>
  <geocam-map id="map"> </geocam-map>

```