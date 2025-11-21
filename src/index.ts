import {
  ASCIIFont,
  Box,
  createCliRenderer,
  Text,
  t,
  green,
  italic,
  TextAttributes, InputRenderable, InputRenderableEvents
} from "@opentui/core"
import Fuse from "fuse.js"

interface HomeAssistantConfig {
  server: string;
  token?: string;
}

interface Entity {
  entity_id: string;
  name: string;
  state: string;
  attributes?: Record<string, any>;
}

const config: HomeAssistantConfig = {
  server: process.env.HA_SERVER_URL || "https://home.horsmanacres.farm",
  token: process.env.HA_ACCESS_TOKEN
};

async function fetchEntities(): Promise<Entity[]> {
  try {
    const url = `${config.server}/api/states`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (response.status === 401) {
      console.error("Authentication required. Please set HA_ACCESS_TOKEN environment variable.");
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const entities: Entity[] = await response.json();
    return entities;
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 401")) {
      console.error("Authentication required. Please set HA_ACCESS_TOKEN environment variable with a valid long-lived access token from Home Assistant.");
    } else {
      console.error("Error fetching entities:", error);
    }
    return [];
  }
}


const renderer = await createCliRenderer({ exitOnCtrlC: true });

const nameInput = new InputRenderable(renderer, {
  id: "name-input",
  width: 50,
  placeholder: "Filter entities...",
  focusedBackgroundColor: "#09352bff"
})

let entities: Entity[] = [];
let filteredEntities: Entity[] = [];
let selectedEntityIndex = -1;
let scrollOffset = 0;
const MAX_VISIBLE = 10;
let fuse: Fuse<Entity> | null = null;

function filterEntities(query: string) {
  if (query.trim() && fuse) {
    const results = fuse.search(query);
    filteredEntities = results.map(result => result.item);
  } else {
    filteredEntities = entities;
  }
  selectedEntityIndex = filteredEntities.length > 0 && query.trim() ? 0 : -1;
  scrollOffset = 0;
}

function getVisibleEntities() {
  return filteredEntities.slice(scrollOffset, scrollOffset + MAX_VISIBLE);
}

function createEntityListBox() {
  const visibleEntities = getVisibleEntities();
  const children = visibleEntities.map((entity, index) => {
    const actualIndex = scrollOffset + index;
    const isSelected = selectedEntityIndex === actualIndex;
    return Box(
      { height: 1 },
      Text({ 
        content: t`${entity.attributes.friendly_name} ${green(italic(entity.state))}`,
        attributes: isSelected ? TextAttributes.BOLD : TextAttributes.NORMAL,
        fg: isSelected ? "#ccccff" : "#999999"
      })
    );
  });
  
  // Fill remaining slots with empty rows
  for (let i = visibleEntities.length; i < MAX_VISIBLE; i++) {
    children.push(Box({ height: 1 }, Text({ content: "" })));
  }
  
  return Box(
    { id: "entity-list", flexDirection: "column", width: 52, height: 12, border: true, borderColor: "#00ff00ff" },
    ...children
  );
}

// Create initial layout
let mainBox: any;

function rebuildLayout() {
  // Remove old layout if it exists
  if (mainBox) {
    renderer.root.remove("main-box");
  }
  
  mainBox = Box(
    { id: "main-box", alignItems: "center", justifyContent: "center", flexGrow: 1, flexDirection: "column" },
    Box(
      { justifyContent: "center", alignItems: "center", marginBottom: 2, flexDirection: "column" },
      ASCIIFont({ font: "tiny", text: "Katamari", color: "#00ff00ff" }),
      Text({ content: "Fuck you, fight me!", attributes: TextAttributes.DIM }),
    ),
    Box(
      { justifyContent: "center", alignItems: "center", marginBottom: 1 },
      nameInput
    ),
    createEntityListBox()
  );
  
  renderer.root.add(mainBox);
}

async function updateEntityList(query: string) {
  filterEntities(query);
  rebuildLayout();
}

async function selectEntity() {
  console.debug("Selected entity index:" + selectedEntityIndex);
  if (selectedEntityIndex >= 0 && selectedEntityIndex < filteredEntities.length) {
    const entity = filteredEntities[selectedEntityIndex];
    console.debug(entity);
    //console.log(`Selected: ${entity.entity_id} - ${entity.name} (State: ${entity.state})`);
    //nameInput.value = entity.attributes.friendly_name;
    // TOOD: pop a control here for modifying the state with an appropriate control.
    // i.e. lights and other boolean things should get a toggle control, numbers get a slider
    // etc.
    // That control should then be wired to update the state of the entity with the appropriate service
    // to its class.
  }
}

nameInput.on(InputRenderableEvents.INPUT, async (value) => {
  console.debug("change detected");
  await updateEntityList(value);
});

nameInput.onKeyDown = async (key: KeyEvent) => {
  if (key.name === 'down') {
    if (selectedEntityIndex < filteredEntities.length - 1) {
      selectedEntityIndex++;
      // Scroll down if needed
      if (selectedEntityIndex >= scrollOffset + MAX_VISIBLE) {
        scrollOffset++;
      }
      rebuildLayout();
    }
  } else if (key.name === 'up') {
    if (selectedEntityIndex > 0) {
      selectedEntityIndex--;
      // Scroll up if needed
      if (selectedEntityIndex < scrollOffset) {
        scrollOffset--;
      }
      rebuildLayout();
    } else if (selectedEntityIndex === 0) {
      selectedEntityIndex = -1;
      scrollOffset = 0;
      rebuildLayout();
    }
  } else if (key.name === 'return') {
     console.debug("enter pressed");
    await selectEntity();
  } else {
    console.debug(key.name);
  }

};

nameInput.focus();

// Initial load - fetch all entities once
entities = await fetchEntities();
fuse = new Fuse(entities, {
  keys: ['entity_id', 'name'],
  threshold: 0.3,
  includeScore: true
});
filterEntities("");
rebuildLayout();
renderer.console.show();
