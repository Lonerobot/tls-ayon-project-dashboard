import React from "react"
import ReactDOM from "react-dom/client"

import DevWrapper from "./dev/DevWrapper"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevWrapper />
  </React.StrictMode>
)
