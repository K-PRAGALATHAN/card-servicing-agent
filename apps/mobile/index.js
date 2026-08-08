// Local entry point. Avoids expo/AppEntry.js's `../../App` import, which assumes
// a hoisted node_modules layout and breaks under pnpm's nested/symlinked layout.
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
