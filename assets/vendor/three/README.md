# Three.js

- Version: `r184` (`0.184.0`)
- Source: <https://github.com/mrdoob/three.js/tree/r184>
- License: MIT (`LICENSE`)
- Bundled modules:
  - `three.module.js`: WebGL renderer plus a re-export of every core class
  - `three.core.js`: core classes imported by the renderer
  - `addons/controls/OrbitControls.js`: camera orbit, zoom, and pan (mouse and touch)
  - `addons/controls/TransformControls.js`: drag handles to move, rotate, and scale an object
  - `addons/renderers/CSS2DRenderer.js`: HTML labels anchored to 3D positions (`CSS2DObject`)
  - `addons/lines/Line2.js` and its `LineGeometry`, `LineSegments2`, `LineSegmentsGeometry`,
    `LineMaterial` dependencies: thick lines, since the built-in `Line` is locked to 1px
  - `OrbitControls.js` (repository root of this folder): the older flat path, kept so that
    `calculus/integral-volume-accumulation/` keeps working. New apps use `addons/controls/`.

This repository uses browser ES modules without npm or a build step.

From an app at `<subject>/<app>/index.html`, add this import map before the
module script:

```html
<script type="importmap">
{
  "imports": {
    "three": "../../assets/vendor/three/three.module.js",
    "three/addons/": "../../assets/vendor/three/addons/"
  }
}
</script>
```

The trailing slash in `"three/addons/"` is required for prefix mapping to work.

Then import Three.js and any addon with its official path:

```html
<script type="module">
  import * as THREE from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

  // Create the scene, camera, renderer, and controls here.
</script>
```

## Adding another addon

Download the file from r184 and keep the original folder layout under `addons/`, for
example `examples/jsm/geometries/ParametricGeometry.js` becomes
`addons/geometries/ParametricGeometry.js`. Addon files import their siblings through
relative paths such as `./LineMaterial.js`, so a flattened layout breaks the load.

```powershell
$base = 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm'
$file = 'geometries/ParametricGeometry.js'
$dest = Join-Path 'assets/vendor/three/addons' $file
New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
Invoke-WebRequest -Uri "$base/$file" -OutFile $dest -UseBasicParsing
```

After adding a file, check its `import` statements. Only `'three'` (resolved by the import
map) and relative sibling paths are allowed; anything else needs to be vendored as well.

## Local testing

ES modules and import maps fail under `file://` because of CORS. Serve the repository
over HTTP instead.

```bash
python -m http.server 8000
```
