# AYON Server Addon — Development Standards & Learnings

Derived from the `project-dashboard` addon build sprint. Intended as a reference for future AYON server addon development.

---

## 1. Python Addon Class

### Router registration
```python
# CORRECT
from fastapi import APIRouter
from ayon_server.addons import BaseServerAddon

class MyAddon(BaseServerAddon):
    async def setup(self) -> None:
        from .api.router import create_router
        self.add_router(create_router(self))   # ✅ self.add_router()
```
- `self.add_router(router)` is the correct method — it appends to `self.routers` (a list).
- **Never** use `self.router.include_router()` or `self.include_router()` — these don't exist.
- The router prefix belongs on `APIRouter(prefix="/my-prefix")`, not on `add_router()`.

### CurrentUser dependency
```python
from ayon_server.api.dependencies import CurrentUser

@router.get("/{project_name}")
async def my_endpoint(
    project_name: str,
    user: CurrentUser,          # ✅ direct type annotation
    # user: CurrentUser = Depends(CurrentUser)  # ❌ wrong — 400 Bad Request
) -> dict: ...
```
`CurrentUser` is a FastAPI dependency resolved via the type annotation system. Wrapping it in `Depends()` breaks the resolution.

### Declaring frontend modules
```python
class MyAddon(BaseServerAddon):
    addon_type = "server"
    frontend_modules = {
        "myRemoteName": ["MyProjectModule"],   # remote → list of exposed module names
    }
```

### Reading project settings
```python
settings = await addon.get_project_settings(project_name)
data = settings.dict()
```

---

## 2. Settings Models

```python
from ayon_server.settings import BaseSettingsModel, SettingsField
from typing import List

class MyItem(BaseSettingsModel):
    _layout = "compact"          # renders list rows as horizontal compact form
    name: str  = SettingsField("", title="Label")
    value: str = SettingsField("", title="Value")
    icon: str  = SettingsField("link", title="Icon", widget="icon")      # material icon picker
    body: str  = SettingsField("", title="Content", widget="textarea")   # multi-line text

class MySettings(BaseSettingsModel):
    items: List[MyItem] = SettingsField(
        default_factory=lambda: [
            {"name": "Example", "value": ""},   # dicts are coerced to MyItem by pydantic
        ],
        title="Items",
    )
```

### Key widget values
| `widget=` | Renders as |
|---|---|
| *(omitted)* | Single-line text input |
| `"textarea"` | Multi-line text area |
| `"icon"` | Searchable material icon dropdown (same as Studio Settings) |

### `_layout = "compact"`
Applied to a `BaseSettingsModel` that is used as a list item. Causes fields to render side-by-side rather than stacked — suitable for short label/value pairs. Remove it for items with textarea fields (they need the full width).

---

## 3. Module Federation Integration

### The critical filter
AYON's `useLoadRemotePages({ moduleKey: 'Project' })` filters module names with `.includes('Project')`. **Your exposed module name must contain the string `"Project"`** or it will never appear as a project tab.

```typescript
// vite.config.ts
federation({
  name: "myRemote",
  exposes: {
    "./MyProjectPage": "./src/integration/MyProjectPage.tsx",
    //       ^^^^^^^^^ must include "Project"
  },
})
```

### Default export shape
AYON spreads the default export as a plain object — it must NOT be a React component.

```typescript
// ✅ Correct
export default {
  component: MyPageComponent,   // the React component
  module: "MyProjectPage",      // must match the exposed key (without "./")
  name: "My Page",              // display name in the nav bar
  id: "my-addon-name",          // unique identifier
}

// ❌ Wrong — exporting a React component directly
export default MyPageComponent
```

### Remote entry URL format
```
/addons/{addonName}/{addonVersion}/frontend/modules/{remoteName}/remoteEntry.js
```
Build output must go to `frontend/dist/modules/{remoteName}/` (served at the above path).

### Tab ordering
Remote page tabs are appended **after** all built-in project tabs (Overview, Tasks, Products, etc.) in the order addons are loaded by the server. There is no `order` field — position cannot be controlled from the addon.

---

## 4. REST API Patterns

### File upload endpoint
```python
from fastapi import UploadFile, HTTPException
from fastapi.responses import FileResponse, Response

@router.post("/{project_name}/banner", status_code=204)
async def upload_banner(
    project_name: str,
    file: UploadFile,
    user: CurrentUser,
) -> Response:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported type")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large")
    ...
    return Response(status_code=204)

@router.get("/{project_name}/banner")
async def get_banner(project_name: str, user: CurrentUser) -> FileResponse:
    ...
    return FileResponse(path=str(file_path), media_type="image/jpeg")

@router.delete("/{project_name}/banner", status_code=204)
async def delete_banner(project_name: str, user: CurrentUser) -> Response:
    ...
    return Response(status_code=204)
```

### File storage location
```python
import os
from pathlib import Path

data_root = Path(os.environ.get("AYON_DATA_DIR", "/srv/ayon/data"))
storage = data_root / "addons" / addon.name / addon.version / "my-files"
storage.mkdir(parents=True, exist_ok=True)
```

### Exceptions
```python
from ayon_server.exceptions import NotFoundException
raise NotFoundException(detail="Resource not found.")
```

---

## 5. Frontend API Layer

```typescript
const ADDON_NAME = "my-addon"
const BASE = `/api/addons/${ADDON_NAME}/${addonVersion}/my-prefix`
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true"

export async function uploadFile(projectName: string, file: File): Promise<void> {
  if (USE_MOCK) return   // ← guard every mutating function

  const body = new FormData()
  body.append("file", file)
  const res = await fetch(`${BASE}/${encodeURIComponent(projectName)}/file`, {
    method: "POST", body, credentials: "include",
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
}
```

---

## 6. styled-components in Module Federation

### Use component references for hover selectors
String-based class selectors (`&:hover .my-class`) can be unreliable when a component is loaded via Module Federation because styled-components may be a separate instance from the host app.

```typescript
// ✅ Reliable — uses the component object as the selector key
const ButtonRow = styled.div`
  opacity: 0;
  pointer-events: none;

  ${BannerArea}:hover & {
    opacity: 1;
    pointer-events: auto;
  }
`

// ⚠️  Fragile in MF context
const BannerArea = styled.div`
  &:hover .my-buttons { opacity: 1; }  // className string matching
`
```

### Invisible overlays block pointer events
An element with `opacity: 0` still intercepts mouse events by default. If it covers interactive content (e.g., a hover-trigger area), it will prevent the hover CSS from triggering correctly.

```typescript
const Overlay = styled.div`
  opacity: 0;
  pointer-events: none;       // ← allow events to pass through when hidden

  ${Parent}:hover & {
    opacity: 1;
    pointer-events: auto;     // ← re-enable when visible
  }
`
```

---

## 7. Build / Deployment Checklist

| | Check |
|---|---|
| ☐ | `package.py` version bumped |
| ☐ | `frontend/package.json` version bumped |
| ☐ | `frontend/src/addonVersion.ts` bumped to match |
| ☐ | `VITE_USE_MOCK_DATA` commented out in `.env.local` |
| ☐ | `yarn build` succeeds |
| ☐ | `python create_package.py` produces zip |
| ☐ | Zip uploaded to AYON and bundle updated |

### The mock data trap
Vite bakes `import.meta.env.*` values into the production bundle **at build time**, reading `.env.local`. If `VITE_USE_MOCK_DATA=true` is active, the entire built addon runs in mock mode — API uploads silently no-op and image URLs point to local dev assets.

Guard against this in `vite.config.ts`:
```typescript
if (mode === "production" && process?.env?.VITE_USE_MOCK_DATA === "true") {
  throw new Error("Build aborted: VITE_USE_MOCK_DATA=true — comment it out in .env.local first.")
}
```
