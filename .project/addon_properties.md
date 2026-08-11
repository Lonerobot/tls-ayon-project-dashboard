# Add-on Property Model

The add-on settings should be implemented using Pydantic Settings Models.

Properties should be grouped logically. We could modularise the idea of a text area - this could contain a block of text (markdown allowed and parsed correctly) I also like the idea we could have a URL component that is rendered as a clickable URL tile, so links can be shown nicely. this link object could have a title (what appears on the tile) and the target link URL

---

# General

```text
enabled
```

---

# Header

```text
project title (required)
subtitle (could be enabled and disabled to hide show on the page)
project banner (an upload area like on the server, see reference image below )
```

---

![1786093003291](image/addon_properties/1786093003291.jpg)

# Project Description

A text block where markdown can be added and rendered nicely on the frontend page. this would be a short boi or outline of the project and the goals

# Project Summary Info

A dedicated callout box with key information included. Perhaps these could be default entries, with the ability to add new ones if needed. this Summary should be aligned at the top of the panel, perhaps a 75-25% split beteween Project Description and Summary Info

```text
resolution

start_date

end_date
```

---

# URL Link Component

A clickable url component that can 

Collection of:

```text
title

url

icon

open_external

enabled
```

---

---
