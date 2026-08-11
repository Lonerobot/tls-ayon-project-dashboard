# Per-User Welcome Modal Flag

This guide describes how to create a per-user flag that records whether a user has loaded a welcome modal, then expose that modal through a frontend addon remote module using the `App` entry point.

The implementation has two parts:

1. A server addon that stores and retrieves the flag for the authenticated user.
2. A frontend addon that exposes an `App` module and uses `fetch` to control the modal.

## Architecture

The flow is:

1. The host application loads the frontend addon’s remote module.
2. The remote module exposes an `App` component.
3. The `App` component requests the current user’s modal status.
4. If the user has not loaded the modal, it renders the modal.
5. Once the modal has rendered, the frontend notifies the server.
6. The server stores the flag against the authenticated user.

The flag must be stored per user. A global configuration value cannot determine whether an individual user has seen the modal.

## Server implementation

### 1. Create a user-specific table

Create a table through the server’s database migration system:

```sql
CREATE TABLE IF NOT EXISTS public.welcome_modal_status (
    user_id UUID PRIMARY KEY,
    loaded BOOLEAN NOT NULL DEFAULT FALSE,
    loaded_at TIMESTAMPTZ
);
```

The `user_id` type should match the type used by the server’s user records.

The primary key ensures that each user has one status record.

### 2. Define the response model

Create a model for the status returned to the frontend:

```python
from typing import Annotated

from ayon_server.types import Field, OPModel


class WelcomeModalStatusModel(OPModel):
    loaded: Annotated[
        bool,
        Field(
            ...,
            description="Whether the current user has loaded the welcome modal",
        ),
    ]
```

The API response will be:

```json
{
  "loaded": false
}
```

### 3. Read the current user’s status

Use the authenticated user supplied by the server. Do not accept a `user_id` from the frontend request.

```python
from ayon_server.api.dependencies import CurrentUser
from ayon_server.lib.postgres import Postgres


async def get_loaded_status(user_id: str) -> bool:
    result = await Postgres.fetch(
        """
        SELECT loaded
        FROM public.welcome_modal_status
        WHERE user_id = $1
        """,
        user_id,
    )

    if not result:
        return False

    return result[0]["loaded"]


async def get_welcome_modal_status(
    user: CurrentUser,
) -> WelcomeModalStatusModel:
    loaded = await get_loaded_status(user.id)
    return WelcomeModalStatusModel(loaded=loaded)
```

A missing row means that the user has not loaded the modal, so the default is `false`.

### 4. Mark the modal as loaded

Create an idempotent write operation:

```python
async def mark_as_loaded(user_id: str) -> None:
    await Postgres.execute(
        """
        INSERT INTO public.welcome_modal_status (
            user_id,
            loaded,
            loaded_at
        )
        VALUES ($1, TRUE, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            loaded = TRUE,
            loaded_at = NOW()
        """,
        user_id,
    )


async def set_welcome_modal_loaded(user: CurrentUser) -> None:
    await mark_as_loaded(user.id)
```

Calling this operation multiple times is safe. The user remains marked as loaded.

### 5. Register the endpoints

Register a `GET` endpoint for reading the status and a `POST` endpoint for marking it as loaded:

```python
def initialize(self) -> None:
    self.add_endpoint(
        "welcome-modal",
        get_welcome_modal_status,
        method="GET",
    )
    self.add_endpoint(
        "welcome-modal",
        set_welcome_modal_loaded,
        method="POST",
    )
```

The resulting routes are conceptually:

```text
GET  /api/addons/<addon-name>/<addon-version>/welcome-modal
POST /api/addons/<addon-name>/<addon-version>/welcome-modal
```

The exact URL prefix depends on how the server mounts addon endpoints.

## Frontend remote module

### 1. Expose the `App` module

Configure the frontend build to expose an `App` entry point:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    react(),
    federation({
      filename: "remoteEntry.js",
      name: "welcomeModalAddon",
      exposes: {
        "./App": "./src/RemoteApp.tsx",
      },
      remotes: {},
      shared: {
        react: {
          singleton: true,
        },
        "react-dom": {
          singleton: true,
        },
      },
    }),
  ],
});
```

The important part is:

```ts
exposes: {
  "./App": "./src/RemoteApp.tsx",
}
```

This tells the host application that the remote addon provides an `App` module.

The host can then load the module using the addon’s remote entry configuration.

### 2. Define the remote component

Create the exposed component:

```tsx
import { useEffect, useState } from "react";
import WelcomeModal from "./WelcomeModal";

type ModalStatus = {
  loaded: boolean;
};

const RemoteApp = () => {
  const [loaded, setLoaded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await fetch(
          "/api/addons/<addon-name>/<addon-version>/welcome-modal",
          {
            method: "GET",
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load modal status: ${response.status}`,
          );
        }

        const data: ModalStatus = await response.json();

        if (!cancelled) {
          setLoaded(data.loaded);
        }
      } catch (error) {
        console.error("Unable to load welcome modal status", error);

        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded !== false) {
    return null;
  }

  return <WelcomeModal onLoaded={() => setLoaded(true)} />;
};

export default RemoteApp;
```

The initial `null` state prevents the modal from rendering before the server response is available.

In this example, a status request failure suppresses the modal. This avoids repeatedly showing the modal when the server cannot confirm or store the user’s state. An alternative policy is to show the modal when the request fails, but that may cause it to appear repeatedly.

### 3. Mark the modal as loaded

The modal should notify the server after it has actually rendered or opened:

```tsx
type WelcomeModalProps = {
  onLoaded: () => void;
};

const WelcomeModal = ({ onLoaded }: WelcomeModalProps) => {
  useEffect(() => {
    let cancelled = false;

    const markAsLoaded = async () => {
      try {
        const response = await fetch(
          "/api/addons/<addon-name>/<addon-version>/welcome-modal",
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to mark modal as loaded: ${response.status}`,
          );
        }

        if (!cancelled) {
          onLoaded();
        }
      } catch (error) {
        console.error("Unable to mark welcome modal as loaded", error);
      }
    };

    markAsLoaded();

    return () => {
      cancelled = true;
    };
  }, [onLoaded]);

  return (
    <div role="dialog" aria-modal="true">
      <h1>Welcome</h1>
      <p>Welcome to the application.</p>
    </div>
  );
};

export default WelcomeModal;
```

The `POST` request does not need a body because the server always updates the currently authenticated user.

## Avoiding repeated requests

If the modal’s `onLoaded` callback is recreated on every render, it can cause the effect to run again. Keep the callback stable or move the request into the parent component.

For example:

```tsx
const RemoteApp = () => {
  const [loaded, setLoaded] = useState<boolean | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      const response = await fetch(
        "/api/addons/<addon-name>/<addon-version>/welcome-modal",
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load modal status");
      }

      const data: ModalStatus = await response.json();
      setLoaded(data.loaded);
    };

    loadStatus().catch((error) => {
      console.error(error);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded !== false) {
      return;
    }

    const markAsLoaded = async () => {
      const response = await fetch(
        "/api/addons/<addon-name>/<addon-version>/welcome-modal",
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to mark modal as loaded");
      }
    };

    markAsLoaded().catch((error) => {
      console.error(error);
    });
  }, [loaded]);

  if (loaded !== false) {
    return null;
  }

  return <WelcomeModal />;
};
```

This version marks the status once after the `GET` request confirms that the user has not loaded the modal.

## Rendering through a portal

If the host application provides a `root` element and the modal must render outside the remote component’s normal position, use a portal:

```tsx
import { createPortal } from "react-dom";

const RemoteApp = () => {
  const root = document.getElementById("root");

  if (!root) {
    return null;
  }

  return createPortal(<WelcomeModal />, root);
};
```

A portal changes where the component is rendered in the DOM, but it remains part of the same React tree.

If the modal is rendered directly by the remote module, a portal is not required:

```tsx
return <WelcomeModal />;
```

Use a portal only when the host integration requires the modal to be attached to a particular DOM node.

## Complete frontend example

```tsx
import { useEffect, useState } from "react";

type ModalStatus = {
  loaded: boolean;
};

const STATUS_URL =
  "/api/addons/<addon-name>/<addon-version>/welcome-modal";

const RemoteApp = () => {
  const [loaded, setLoaded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response = await fetch(STATUS_URL, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to retrieve modal status");
        }

        const data: ModalStatus = await response.json();

        if (!cancelled) {
          setLoaded(data.loaded);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded !== false) {
      return;
    }

    let cancelled = false;

    const markAsLoaded = async () => {
      try {
        const response = await fetch(STATUS_URL, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to mark modal as loaded");
        }

        if (!cancelled) {
          setLoaded(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    markAsLoaded();

    return () => {
      cancelled = true;
    };
  }, [loaded]);

  if (loaded !== false) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true">
      <h1>Welcome</h1>
      <p>Welcome to the application.</p>
    </div>
  );
};

export default RemoteApp;
```

The build configuration exposes this component as:

```ts
exposes: {
  "./App": "./src/RemoteApp.tsx",
}
```

The host application can then load the addon’s remote `App` module and render it as part of the main application.

## Versioning the modal

If updated modal content should be shown again, store a version rather than only a boolean:

```sql
CREATE TABLE IF NOT EXISTS public.welcome_modal_status (
    user_id UUID PRIMARY KEY,
    version TEXT NOT NULL,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The server can compare the stored version with the current modal version. When the modal content changes, increment the version and users will be shown the updated modal once.

## Design considerations

- Store the status by authenticated `user_id`.
- Do not accept an arbitrary user ID from the frontend.
- Treat a missing database row as `loaded = false`.
- Make the write operation idempotent.
- Expose the frontend entry point as `./App`.
- Use `fetch` directly when a query abstraction is unnecessary.
- Keep the modal hidden while the initial status is loading.
- Mark the flag after the modal has rendered successfully.
- Keep loading, dismissing, and completing as separate states if they have different meanings.
- Ensure the host and remote share the same React and `react-dom` instances.
- Add a database migration and tests for missing records, existing records, authenticated access, and repeated `POST` requests.