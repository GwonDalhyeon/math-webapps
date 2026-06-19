# Three.js

- Version: `r184` (`0.184.0`)
- Source: <https://github.com/mrdoob/three.js/tree/r184>
- License: MIT (`LICENSE`)
- Bundled modules:
  - `three.module.js`: Three.js WebGL renderer
  - `three.core.js`: core classes imported by the renderer
  - `OrbitControls.js`: mouse and touch camera controls

This repository uses browser ES modules without npm or a build step.

From an app at `<subject>/<app>/index.html`, add this import map before the
module script:

```html
<script type="importmap">
{
  "imports": {
    "three": "../../assets/vendor/three/three.module.js"
  }
}
</script>
```

Then import Three.js and the controls:

```html
<script type="module">
  import * as THREE from "three";
  import { OrbitControls } from "../../assets/vendor/three/OrbitControls.js";

  // Create the scene, camera, renderer, and controls here.
</script>
```

ES modules should be tested through a local HTTP server rather than by opening
the HTML file directly with `file://`.
