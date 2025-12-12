# GeoCam Phone Matching Project

## Project Overview

Web application for triangulating 3D positions from GeoCam 360° panorama scenes, now extending to **phone photo localization** using MegaLoc and MatchAnything.

### Core Goals
1. Allow users to take a phone photo of a scene
2. Match the phone photo against GeoCam panorama database
3. Determine 6DoF pose of the phone photo
4. Enable triangulation from combined GeoCam + phone views

---

## Viewer Project

### Repository
**GitHub**: https://github.com/msuther898/geocam-viewer-testing
**Fork of**: geocamxyz/geocam-viewer
**Deployed**: geocam-viewer-testing.vercel.app

### Project Structure
```
geocam-viewer-testing/
├── src/
│   ├── index.js              # Main SDK exports
│   ├── lib/
│   │   ├── viewer.js         # Core panorama viewer (Three.js)
│   │   ├── depth-estimator.js # Depth Anything V2 integration
│   │   └── plugin-point-tagger.js # Point tagging for triangulation
├── dist/                      # Built output
├── examples/
│   └── depth-triangulation-demo.html
├── vite.config.js
└── package.json
```

### Key Branches
- `main` - Stable release
- `claude/depth-rendering-viewer-*` - Development branches with depth/triangulation features

### Viewer SDK Usage
```html
<!-- Import map -->
<script type="importmap">
{
  "imports": {
    "geocam-viewer": "https://cdn.jsdelivr.net/gh/msuther898/geocam-viewer-testing@main/dist/geocam-viewer.js"
  }
}
</script>

<!-- Basic viewer -->
<geocam-viewer 
  src="https://manager.geocam.xyz/{calibration}/{source}/{shot}.jpg"
  fov="35" 
  facing="0" 
  horizon="0">
</geocam-viewer>
```

### Available Plugins
- `geocam-viewer-orbit-controls` - Mouse/keyboard pan, tilt, zoom
- `geocam-viewer-compass-needle` - Direction indicator
- `geocam-viewer-label` - Shot info display
- `geocam-viewer-url-fragments` - State persistence in URL hash
- `geocam-viewer-loading-indicator` - Progress bars
- `geocam-viewer-screen-shot` - Clipboard capture
- `geocam-viewer-prev-next-control` - Sequential navigation
- `geocam-viewer-arcgis-map` - Esri map connector
- `geocam-viewer-multiview-window` - Split view layout

### Full Viewer Implementation
```html
<geocam-viewer>
  <geocam-viewer-orbit-controls></geocam-viewer-orbit-controls>
  <geocam-viewer-compass-needle></geocam-viewer-compass-needle>
  <geocam-viewer-label></geocam-viewer-label>
  <geocam-viewer-url-fragments
    params="fov,facing,horizon,shot,visible,left,top,width,height,mode,zoom,center">
  </geocam-viewer-url-fragments>
  <geocam-viewer-loading-indicator></geocam-viewer-loading-indicator>
  <geocam-viewer-prev-next-control></geocam-viewer-prev-next-control>
  <geocam-viewer-arcgis-map
    src="https://production.geocam.io/arcgis/rest/services/cell+xsxqmli+156/FeatureServer">
  </geocam-viewer-arcgis-map>
  <geocam-viewer-multiview-window target="map"></geocam-viewer-multiview-window>
</geocam-viewer>
<geocam-map id="map"></geocam-map>
```

### Shot URL Format
```
https://manager.geocam.xyz/{calibration_id}/{source_id}/{shot_id}.jpg

# For production cells:
https://production.geocam.io/arcgis/rest/services/cell+{cell_id}/FeatureServer
```

### Viewer Attributes
| Attribute | Description | Example |
|-----------|-------------|---------|
| `src` | Shot image URL | `https://manager.geocam.xyz/6/1270/102.jpg` |
| `fov` | Field of view (degrees) | `35` (zoomed) to `120` (wide) |
| `facing` | Azimuth angle (0=North, 180=South) | `114.3` |
| `horizon` | Tilt angle (0=level, 90=up, -90=down) | `27.9` |

---

## Scene Data

### Bridge Scene (Primary Test Dataset)
- **Cell ID**: `xsxqmli+156`
- **Location**: Orange County, CA (~33.4165°N, 117.617°W)
- **Viewer URL**: `https://production.geocam.io/viewer/map/cell+xsxqmli+156`
- **Project**: `https://production.geocam.io/projects/y7b9bjz/cells/7141/edit`

### Data Endpoints
```
# Feature Service (shot positions, metadata)
https://production.geocam.io/arcgis/rest/services/cell+xsxqmli+156/FeatureServer/0

# Query specific shot (get XYZ position)
/query?f=json&where=id={SHOT_ID}&outFields=*&returnGeometry=true&returnZ=true

# Calibration data
https://production.geocam.io/outputs/34372

# Project/Block data
https://production.geocam.io/outputs/34466
```

### Camera Intrinsics (from calibration.json)
```javascript
CAM = {
  fx: 1814.53,
  fy: 1814.66,
  cx: 2071.86,
  cy: 1479.00,
  width: 4096,
  height: 3000,
  distType: 'Fisheye4ppFT',  // Equidistant fisheye with 4-param polynomial
  // Distortion: r_distorted = theta * (1 + k1*θ² + k2*θ⁴ + k3*θ⁶ + k4*θ⁸)
  k1: 0.0,  // Load from calibration.json
  k2: 0.0,
  k3: 0.0,
  k4: 0.0
}
```

### Rig Configuration
- 3 fisheye cameras per rig (forward, left, right at ~120° apart)
- Stitched to equirectangular panorama
- Post-processed GNSS positions available in feature service

---

## Existing Triangulation System

### Current Implementation (Tampermonkey v10.1)
Located in: `geocam-triangulation-v10.1.user.js`

**Workflow (before phone matching)**:
1. Click point in panorama → center view
2. Click again → lock first ray
3. Navigate to neighbor shots (5 before, 5 after in sequence)
4. Click same feature in grid of neighbor views
5. Triangulate using least-squares ray intersection

**Key Functions**:
- `calcRayDir(x, y, rect)` - Screen coords → ray direction
- `triangulate(views)` - Multi-view triangulation with GDOP
- `getShotZ(shotId)` - Fetch elevation from feature service
- Fisheye undistortion using Newton-Raphson iteration

### Limitations Addressed by Phone Matching
- Requires same feature visible in multiple sequential shots
- Manual clicking error accumulates
- No external viewpoints possible

---

## Phone Matching Architecture

### Target Pipeline
```
Phone Photo → MegaLoc (coarse pose) → MatchAnything (refinement) → 6DoF Pose
     │                                                                  │
     └──────────────────────────────────────────────────────────────────┘
                                    ↓
                         Combined Triangulation
                    (GeoCam rays + Phone ray)
```

### Integration with geocam-viewer-testing
The phone matching will be added as a new plugin/module:

```
src/lib/
├── phone-matcher.js          # NEW: MegaLoc + MatchAnything wrapper
├── perspective-extractor.js  # NEW: Extract perspective crops from pano
└── pose-estimator.js         # NEW: 6DoF pose from matches
```

**Proposed Plugin**: `<geocam-viewer-phone-match>`
```html
<geocam-viewer>
  <geocam-viewer-phone-match 
    api-endpoint="https://your-server/match"
    show-matches="true">
  </geocam-viewer-phone-match>
</geocam-viewer>
```

### MegaLoc Integration
**Purpose**: Hierarchical localization - find which GeoCam shots the phone photo matches

**Expected Inputs**:
- Phone photo (perspective, typical ~60-80° FOV)
- GeoCam panorama database (equirectangular, 360°)

**Expected Outputs**:
- Top-k matching panoramas
- Coarse relative pose estimate

**Repository**: https://github.com/cvg/MegaLoc

### MatchAnything Integration
**Purpose**: Dense feature matching for precise alignment

**Use Cases**:
- Cross-domain matching (phone perspective ↔ panorama crop)
- Works without scene-specific training
- Handles significant viewpoint changes

**Repository**: https://github.com/zju3dv/MatchAnything

### Alternative Approaches to Consider
1. **LightGlue + SuperPoint** - Fast learned matching
2. **LoFTR** - Dense matching without keypoint detection
3. **DUSt3R/MASt3R** - Direct 3D reconstruction from image pairs
4. **OpenGlue** - Open-source learned matcher
5. **Direct COLMAP integration** - Add phone image to existing reconstruction

---

## Data Formats

### GeoCam Panorama Access
```javascript
// Extract from URL hash
const urlParams = new URLSearchParams(location.hash.substring(1));
const shotId = urlParams.get('shot');        // e.g., "8670877"
const fov = parseFloat(urlParams.get('fov')); // e.g., 66.3
const facing = parseFloat(urlParams.get('facing')); // azimuth in degrees
const horizon = parseFloat(urlParams.get('horizon')); // elevation offset
const center = JSON.parse(urlParams.get('center')); // [lng, lat]
```

### Shot Query Response
```json
{
  "features": [{
    "attributes": {
      "id": 8670877,
      "timestamp": "2024-...",
      "heading": 114.3
    },
    "geometry": {
      "x": -117.61704,
      "y": 33.416547,
      "z": 45.2,
      "spatialReference": { "wkid": 4326 }
    }
  }]
}
```

### Phone Photo Expected Metadata
```json
{
  "filename": "IMG_1234.jpg",
  "width": 4032,
  "height": 3024,
  "focalLength_mm": 4.25,
  "sensorWidth_mm": 6.17,
  "gps": {
    "lat": 33.4165,
    "lng": -117.617,
    "accuracy_m": 5.0
  },
  "compass_heading": 180.0,
  "timestamp": "2025-12-10T10:30:00Z"
}
```

---

## Implementation Tasks

### Phase 1: Viewer Plugin Structure
- [ ] Create `src/lib/phone-matcher.js` module
- [ ] Add phone upload UI component to viewer
- [ ] Extract perspective crop from panorama at estimated viewpoint
- [ ] Store extracted features for matching

### Phase 2: Coarse Localization (MegaLoc)
- [ ] Set up MegaLoc server endpoint or WASM build
- [ ] Build panorama database index for cell (precompute)
- [ ] Query with phone photo to find top-k matching shots
- [ ] Display candidate matches in viewer UI

### Phase 3: Dense Matching (MatchAnything)
- [ ] Integrate MatchAnything (Python backend or ONNX)
- [ ] Run dense matching between phone and best pano crop
- [ ] Visualize match points in both phone and pano views
- [ ] Filter matches by geometric consistency (RANSAC)

### Phase 4: Pose Estimation
- [ ] Estimate essential matrix from matches
- [ ] Recover relative pose (R, t)
- [ ] Transform to world coordinates using pano pose
- [ ] Display phone camera frustum on map

### Phase 5: Triangulation Integration
- [ ] Add phone view ray to existing triangulation system
- [ ] Combine with GeoCam rays for 3D point estimation
- [ ] Show confidence based on ray geometry (GDOP)
- [ ] Export combined results as GeoJSON

### Phase 6: Deployment
- [ ] Build as standalone viewer plugin
- [ ] Deploy to Vercel (geocam-viewer-testing)
- [ ] Create Tampermonkey userscript version for production.geocam.io

---

## Development Environment

### Viewer Project Setup
```bash
# Clone your fork
git clone https://github.com/msuther898/geocam-viewer-testing.git
cd geocam-viewer-testing

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build
```

### Vite Dev Server
- Runs on `http://localhost:5173` by default
- Hot module replacement enabled
- Source maps for debugging

### Python Backend (for MegaLoc/MatchAnything)
```bash
pip install torch torchvision
pip install opencv-python
pip install kornia           # Geometric transforms
pip install hloc             # Hierarchical localization (MegaLoc deps)

# Clone matching repos
git clone https://github.com/cvg/MegaLoc.git
git clone https://github.com/zju3dv/MatchAnything.git
```

### Browser Dependencies (loaded via CDN)
- Three.js r128 - 3D rendering
- Esri JS API 4.x - Map display
- Transformers.js - Depth Anything V2 (optional)
- OpenCV.js 4.x - Feature matching (optional)

### Key Files
```
geocam-viewer-testing/
├── src/
│   ├── index.js                    # Main exports
│   └── lib/
│       ├── viewer.js               # Core Three.js viewer
│       ├── depth-estimator.js      # Depth Anything integration
│       └── plugin-point-tagger.js  # Triangulation tagging
├── dist/geocam-viewer.js           # Built bundle
└── vite.config.js                  # Build config

# Tampermonkey scripts (separate)
/geocam-triangulation-v10.1.user.js  # Production overlay tool
```

### Deployment
- **Vercel**: Auto-deploys from `main` branch
- **CDN**: `https://cdn.jsdelivr.net/gh/msuther898/geocam-viewer-testing@{version}/dist/geocam-viewer.js`

---

## PyGeoCam API Reference (if available locally)

```python
import pygeocam as gc

# Load scene
sfmScene = gc.SfmScene.loadSceneRawMode(projectFilename)
sfmBlock = sfmScene.getLastBlock()

# Camera intrinsics
cameraParams = sfmBlock.getCameraParams(cameraIndex)

# Undistort pixel to normalized ray (KEY FUNCTION)
normalizedPoint = cameraParams.undistortToNormalised([pixel_x, pixel_y])
# Returns Point2d where x,y are ray direction with focal=1

# Get camera pose
pose = sfmBlock.getPhotoWorldPoseFromPhotoIndex(photoIndex)  # 4x4 matrix
position = sfmBlock.getShotForwardPosition(shotIndex)
```

---

## Notes

### Fisheye Handling
The panoramas are stitched from dual fisheye cameras. The web viewer renders equirectangular projection. For accurate ray casting:
1. Account for stitching seams (~2° blend zones)
2. Use calibration data for proper undistortion
3. Horizon/tilt offsets stored per-shot

### Coordinate Systems
- **WGS84 (EPSG:4326)**: Lat/lng/alt for positions
- **Web Mercator (EPSG:102100)**: Used by feature service extents
- **Camera frame**: Z forward, Y up, X right
- **World frame**: East-North-Up (ENU) relative to shot position

### Error Sources in Current System
- GPS accuracy: ~2-5m (post-processed better)
- Click precision: ~0.1m equivalent
- Lens distortion (without calibration): ~0.2-0.5m
- Mesh approximation in viewer: ~0.1m

### Testing Shots (Bridge Scene)
- Shot 8670877: FOV 66°, facing 114° (ESE)
- Shot 8670935: FOV 35°
- Shot 8667956: FOV 35°, straight ahead
- Shot 8670061: FOV 118°, facing 184° (S)
