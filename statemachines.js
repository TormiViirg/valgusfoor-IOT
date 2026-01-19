let intersectionStates = null;
const RED = "Red";
const YELLOW = "Yellow";
const GREEN = "Green";
let currentState = "ALL_YELLOW";

const COLOR_MAP_STATE_TO_DOM = { 
  "Red":    "punane",
  "Yellow": "kollane",
  "Green":  "roheline"
};

const threeWay = {
    ALL_YELLOW: {
        name: "All Yellow (Safety Mode)",
        lights: { 
            N: YELLOW,
            S: YELLOW,  
            W: YELLOW 
        },
        next: "ALL_YELLOW"
    },

    ALL_RED: {
        name: "All-Red",
        lights: {
            N: RED,
            S: RED,
            W: RED
        },
        next: "SOUTH_GREEN"
    },

    SOUTH_GREEN: {
        name: "South Green",
        lights: {
            N: RED,
            S: GREEN,
            W: RED 
        },
        next: "SOUTH_YELLOW"
    },

    SOUTH_YELLOW: {
        name: "South Yellow",
        lights: {
            N: RED,
            S: YELLOW, 
            W: RED 
        },
        next: "NW_GREEN"
    },

    NW_GREEN: {
        name: "North-West Green",
        lights: { 
            N: GREEN,
            S: RED,  
            W: GREEN 
        },
        next: "NW_YELLOW"
    },

    NW_YELLOW: {
        name: "North-West Yellow",
        lights: { 
            N: YELLOW,
            S: RED,
            W: YELLOW 
        },
        next: "ALL_RED"
    }
};

const fourWay = {
    ALL_YELLOW: {
        name: "All Yellow (Safety Mode)",
        lights: {
            N: YELLOW, 
            S: YELLOW, 
            E: YELLOW,
            W: YELLOW 
        },
        next: "ALL_YELLOW"
    },
    ALL_RED: {
        name: "All-Red",
        lights: { 
            N: RED,
            S: RED, 
            E: RED,
            W: RED 
        },
        next: "NS_GREEN"
    },

    NS_GREEN: {
        name: "North-South Green",
        lights: { 
            N: GREEN,
            S: GREEN, 
            E: RED,
            W: RED 
        },
        next: "NS_YELLOW"
    },

    NS_YELLOW: {
        name: "North-South Yellow",
        lights: { 
            N: YELLOW, 
            S: YELLOW, 
            E: RED,
            W: RED 
        },
        next: "ALL_RED_2"
    },

    ALL_RED_2: {
        name: "All-Red (transition)",
        lights: { 
            N: RED,
            S: RED,
            E: RED, 
            W: RED
        },
        next: "EW_GREEN"
    },

    EW_GREEN: {
        name: "East-West Green",
        lights: {
            N: RED, 
            S: RED,
            E: GREEN,
            W: GREEN 
        },
        next: "EW_YELLOW"
    },

    EW_YELLOW: {
        name: "East-West Yellow",
        lights: { 
            N: RED,
            S: RED,
            E: YELLOW,
            W: YELLOW 
        },
        next: "ALL_RED"
    }
};

const twoWay = {
    ALL_YELLOW: {
        name: "All Yellow (Safety Mode)",
        lights: { 
            E: YELLOW,
            W: YELLOW 
        },
        next: "ALL_YELLOW"
    },

    EW_GREEN: {
        name: "East-West Green",
        lights: { 
            E: GREEN,
            W: GREEN 
        },
        next: "EW_YELLOW"
    },

    EW_YELLOW: {
        name: "East-West Yellow",
        lights: { 
            E: YELLOW,
            W: YELLOW
        },
        next: "EW_RED"
    },

    EW_RED: {
        name: "East-West Red",
        lights: { 
            E: RED,
            W: RED
        },
        next: "EW_GREEN"
    }
};

function updateIntersectionStateMachine(cleanedResponse) {
    if (!Array.isArray(cleanedResponse)) return;
    intersectionStates = detectIntersectionType(cleanedResponse);
}


function transition() {
    if (!intersectionStates) {
        currentState = "ALL_YELLOW";
        intersectionStates = detectIntersectionType(window.cleanedResponse);
    }

    if (!intersectionStates || !intersectionStates.ALL_YELLOW) {
        intersectionStates = { ALL_YELLOW: threeWay.ALL_YELLOW };
    }

    let state = intersectionStates[currentState];

    if (!state) {
        console.warn("Invalid state, falling back to ALL_YELLOW");
        currentState = "ALL_YELLOW";
        state = intersectionStates[currentState];
    }

    console.log(`\n=== ${state.name} ===`);
    console.log(state.lights);

    currentState = state.next;
}


function detectIntersectionType(cleanedResponse) {

    if (!Array.isArray(cleanedResponse)) {
        return { ALL_YELLOW: twoWay.ALL_YELLOW };
    }

    const directions = cleanedResponse.map(d => d.CardinalDirection);

    const count = directions.length;

    if (count === 2) return twoWay;
    if (count === 3) return threeWay;
    if (count === 4) return fourWay;

    console.warn("Invalid intersection: entering ALL_YELLOW safety mode");

    return { ALL_YELLOW: fourWay.ALL_YELLOW };
}


function updateLightsFromStateMachine(mappedLights) {
    document.querySelectorAll('.wrapper').forEach(wrapper => {

        const direction = wrapper.dataset.direction;
        const lampColor = mappedLights[direction];

        const lamps = {
            punane:   wrapper.querySelector('.lamp[data-color="punane"]'),
            kollane:  wrapper.querySelector('.lamp[data-color="kollane"]'),
            roheline: wrapper.querySelector('.lamp[data-color="roheline"]')
        };

        for (let key in lamps) lamps[key].classList.remove("on");

        if (lampColor && lamps[lampColor]) {
            lamps[lampColor].classList.add("on");
        }
    });
}


setInterval(transition, 10000);

window.stateMachines = { 
    twoWay, 
    threeWay, 
    fourWay, 
    COLOR_MAP_STATE_TO_DOM
};