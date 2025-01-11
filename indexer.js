import { hash } from "https://esm.run/starknet@5.14";

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
      },
      {
        fromAddress: "0x02b99858efd4ba5240de2f1f54880878f135be8b5cc4eeedc4a72fbd6e7fc892",
        keys: [hash.getSelectorFromName("CanvasFavorited")],
      },
      {
        fromAddress: "0x02b99858efd4ba5240de2f1f54880878f135be8b5cc4eeedc4a72fbd6e7fc892",
        keys: [hash.getSelectorFromName("CanvasUnfavorited")],
      }
    ],
  },
  sinkType: "console",
  sinkOptions: {},
};

export function factory({ events }) {
  const deployedCanvases = [];
  
  const newFilters = events.map(({ event }) => {
    if (event.data) {
      const canvasAddress = event.data[1];
      deployedCanvases.push({
        event_type: "canvas_created",
        canvas_id: event.data[0],
        canvas_address: canvasAddress,
        init_params: event.data[2]
      });
  
      return [
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("ColorAdded")],
        },
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("PixelPlaced")],
        },
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("BasicPixelPlaced")],
        },
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("ExtraPixelsPlaced")],
        },
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("HostAwardedUser")],
        },
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("CanvasStarted")],
        },
        {
          fromAddress: canvasAddress,
          keys: [hash.getSelectorFromName("CanvasEnded")],
        }
      ];
    }
    return null;
  })
  .filter(filters => filters !== null)
  .flat();

  return {
    filter: newFilters.length > 0 ? {
      header: { weak: true },
      events: newFilters
    } : null,
    data: deployedCanvases
  };
}

export default function transform({ events }) {
  if (!events || events.length === 0) {
    return [];
  }

  return events.map(({ event }) => {
    if (!event || !event.keys || event.keys.length === 0) {
      return null;
    }

    const eventKey = hash.getSelector(event.keys[0]);
    
    if (eventKey === hash.getSelectorFromName("CanvasCreated")) {
      return {
        event_type: "canvas_created",
        canvas_id: event.data[0],
        canvas_address: event.data[1],
        init_params: event.data[2]
      };
    }

    if (eventKey === hash.getSelectorFromName("CanvasFavorited")) {
      return {
        event_type: "canvas_favorited",
        canvas_id: event.data[0],
        user: event.data[1]
      };
    }

    if (eventKey === hash.getSelectorFromName("CanvasUnfavorited")) {
      return {
        event_type: "canvas_unfavorited",
        canvas_id: event.data[0],
        user: event.data[1]
      };
    }
    
    if (eventKey === hash.getSelectorFromName("PixelPlaced")) {
      return {
        event_type: "pixel_placed",
        canvas_address: event.fromAddress,
        placed_by: event.data[0],
        position: event.data[1],
        color: event.data[2]
      };
    }

    if (eventKey === hash.getSelectorFromName("ColorAdded")) {
      return {
        event_type: "color_added",
        canvas_address: event.fromAddress,
        color_key: event.data[0],
        color: event.data[1]
      };
    }

    if (eventKey === hash.getSelectorFromName("BasicPixelPlaced")) {
      return {
        event_type: "basic_pixel_placed",
        canvas_address: event.fromAddress,
        placed_by: event.data[0],
        timestamp: event.data[1]
      };
    }

    return {
      event_type: "unknown",
      event_key: eventKey,
      from_address: event.fromAddress,
      keys: event.keys,
      data: event.data
    };
  }).filter(event => event !== null);
}