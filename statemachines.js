const RED = "Red";
const YELLOW = "Yellow";
const GREEN = "Green";

const threeWayJunction = {
    ALL_RED: {
        name: "All-Red",
        lights: { South: RED, East: RED, West: RED },
        next: "SOUTH_GREEN"
    },

    SOUTH_GREEN: {
        name: "South Green",
        lights: { South: GREEN, East: RED, West: RED },
        next: "SOUTH_YELLOW"
    },

    SOUTH_YELLOW: {
        name: "South Yellow",
        lights: { South: YELLOW, East: RED, West: RED },
        next: "EW_GREEN"
    },

    EW_GREEN: {
        name: "East-West Green",
        lights: { South: RED, East: GREEN, West: GREEN },
        next: "EW_YELLOW"
    },

    EW_YELLOW: {
        name: "East-West Yellow",
        lights: { South: RED, East: YELLOW, West: YELLOW },
        next: "ALL_RED"
    }
};

const fourWay = {
    ALL_RED: {
        name: "All-Red",
        lights: { North: RED, South: RED, East: RED, West: RED },
        next: "NS_GREEN"
    },

    NS_GREEN: {
        name: "North-South Green",
        lights: { North: GREEN, South: GREEN, East: RED, West: RED },
        next: "NS_YELLOW"
    },

    NS_YELLOW: {
        name: "North-South Yellow",
        lights: { North: YELLOW, South: YELLOW, East: RED, West: RED },
        next: "ALL_RED_2"
    },

    ALL_RED_2: {
        name: "All-Red (transition)",
        lights: { North: RED, South: RED, East: RED, West: RED },
        next: "EW_GREEN"
    },

    EW_GREEN: {
        name: "East-West Green",
        lights: { North: RED, South: RED, East: GREEN, West: GREEN },
        next: "EW_YELLOW"
    },

    EW_YELLOW: {
        name: "East-West Yellow",
        lights: { North: RED, South: RED, East: YELLOW, West: YELLOW },
        next: "ALL_RED"
    }
};

const twoWay = {
    EW_GREEN: {
        name: "East-West Green",
        light: { East: GREEN, West: Green },
        next: "EW_YELLOW"
    },

    EW_YELLOW: {
        name: "East-West Yellow",
        light: { East: YELLOW, West: YELLOW },
        next: "EW_RED"
    },

    EW_RED: {
        name: "East-West Red",
        light: { East: RED, West: RED },
        next: "EW_GREEN"
    }
};

let currentState = "ALL_YELLOW";

function transition() {
    const state = states[currentState];

    console.log(`\n=== ${state.name} ===`);
    console.log(`South: ${state.lights.South}`);
    console.log(`East : ${state.lights.East}`);
    console.log(`West : ${state.lights.West}`);

    currentState = state.next;
}

setInterval(transition, 10000);
