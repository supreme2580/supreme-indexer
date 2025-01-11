import { hash } from "https://esm.run/starknet@5.14";

// Configuration for the factory indexer - this will only watch the factory contract
export const config = {
  streamUrl: "https://sepolia.starknet.a5a.ch",
  startingBlock: 444_932,
  network: "starknet",
  filter: {
    header: { weak: true },
    events: [
      {
        fromAddress: "0x02b99858efd4ba5240de2f1f54880878f135be8b5cc4eeedc4a72fbd6e7fc892",
        keys: [hash.getSelectorFromName("CanvasCreated")],
      }
    ],
  },
  sinkType: "console",
  sinkOptions: {},
};

// Factory function to handle new canvas deployments
export function factory({ events }) {
  if (!events || events.length === 0) {
    console.log("Factory: No events to process");
    return {};
  }

  // Track deployed canvases for the integration
  const deployedCanvases = [];
  
  // Create filters for new canvases
  const newFilters = events.map(({ event }) => {
    const canvasAddress = event.data[1];
    deployedCanvases.push({
      canvas_id: event.data[0],
      canvas_address: canvasAddress,
      init_params: event.data[2]
    });

    return {
      fromAddress: canvasAddress,
      keys: [
        hash.getSelectorFromName("PixelPlaced"),
        hash.getSelectorFromName("ColorAdded"),
        hash.getSelectorFromName("CanvasStarted"),
        hash.getSelectorFromName("CanvasEnded")
      ]
    };
  });

  return {
    // Return new filters to be merged with existing ones
    filter: {
      header: { weak: true },
      events: newFilters
    },
    // Pass deployed canvas info to the integration
    data: deployedCanvases
  };
}

// Transform function to handle events from both factory and canvases
export default function transform({ events }) {
  return events.map(({ event }) => {
    const eventKey = hash.getSelector(event.keys[0]);
    
    // Handle CanvasCreated events from factory
    if (eventKey === hash.getSelectorFromName("CanvasCreated")) {
      return {
        event_type: "canvas_created",
        canvas_id: event.data[0],
        canvas_address: event.data[1],
        init_params: event.data[2]
      };
    }
    
    // Handle PixelPlaced events from canvases
    if (eventKey === hash.getSelectorFromName("PixelPlaced")) {
      return {
        event_type: "pixel_placed",
        canvas_address: event.fromAddress,
        position: event.data[0],
        color: event.data[1],
        user: event.data[2]
      };
    }

    // Handle ColorAdded events
    if (eventKey === hash.getSelectorFromName("ColorAdded")) {
      return {
        event_type: "color_added",
        canvas_address: event.fromAddress,
        color_key: event.data[0],
        color: event.data[1]
      };
    }

    // Handle CanvasStarted events
    if (eventKey === hash.getSelectorFromName("CanvasStarted")) {
      return {
        event_type: "canvas_started",
        canvas_address: event.fromAddress,
        timestamp: event.data[0]
      };
    }

    // Handle CanvasEnded events
    if (eventKey === hash.getSelectorFromName("CanvasEnded")) {
      return {
        event_type: "canvas_ended",
        canvas_address: event.fromAddress,
        timestamp: event.data[0]
      };
    }

    // Return unknown events with full details for debugging
    return {
      event_type: "unknown",
      event_key: eventKey,
      from_address: event.fromAddress,
      keys: event.keys,
      data: event.data
    };
  });
}