import Kinect2 from 'kinect2';
import { createServer } from 'http';
import { Server } from 'socket.io';

const kinect = new Kinect2();
let activeUser = null;
const handStates = { left: null, right: null };

// Datos para swipe en X, Y y Z
const gestureDataStore = {
    left: { startX: null, startY: null, startZ: null, startTime: null },
    right: { startX: null, startY: null, startZ: null, startTime: null }
};

const SWIPE_THRESHOLD = 0.20; // Sensibilidad movimiento X/Y
const PUSH_THRESHOLD = 0.2;  // Sensibilidad para "click" (Z)
const SWIPE_TIME_THRESHOLD = 2000; // Tiempo max para gesto

const server = createServer();
const io = new Server(server, {
    cors: { origin: "*" } // Allow connections from any origin (adjust for production)
});

if (kinect.open()) {
    server.listen(8000, () => {
        console.log("Server listening on http://localhost:8000");
    });

    kinect.on('bodyFrame', (bodyFrame) => {
        let closestBody = null;
        let minDistance = Infinity;

        bodyFrame.bodies.forEach((body) => {
            if (body.tracked) {
                const distance = body.joints[3]?.cameraZ;
                if (typeof distance === 'number' && distance < minDistance) {
                    minDistance = distance;
                    closestBody = body;
                }
            }
        });

        if (closestBody) {
            activeUser = closestBody;
            processHandGestures(activeUser);
        }
    });

    kinect.openBodyReader();
} else {
    console.log("Error: No se pudo inicializar el Kinect. Verifica conexión y SDK.");
    process.exit(1);
}

const processHandGestures = (body) => {
    const hands = [
        { name: 'left', joint: body.joints[7], state: body.leftHandState },
        { name: 'right', joint: body.joints[11], state: body.rightHandState }
    ];

    hands.forEach(hand => {
        const { name: handName, state: handState, joint } = hand;
        const x = joint?.cameraX;
        const y = joint?.cameraY;
        const z = joint?.cameraZ;
        const trackingState = joint?.trackingState;

        if (trackingState !== 2) return; // Solo manos rastreadas

        // Detectar gestos por estado (open, closed, lasso)
        if (handState !== handStates[handName] && [2, 3, 4].includes(handState)) {
            let gestureType = null;
            if (handState === 2) gestureType = 'hand_open';
            else if (handState === 3) gestureType = 'hand_closed';
            else if (handState === 4) gestureType = 'hand_lasso';

            if (gestureType) emitGesture(handName, gestureType, x, y, z);
            handStates[handName] = handState;
        }

        // Detectar movimientos (swipes y click)
        detectMovements(handName, x, y, z);
    });
};

const detectMovements = (handName, x, y, z) => {
    const store = gestureDataStore[handName];

    if (store.startX === null) {
        store.startX = x;
        store.startY = y;
        store.startZ = z;
        store.startTime = Date.now();
        return;
    }

    const deltaX = x - store.startX;
    const deltaY = y - store.startY;
    const deltaZ = store.startZ - z; // Z disminuye si se empuja hacia adelante
    const deltaTime = Date.now() - store.startTime;

    // Swipe horizontal
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && deltaTime < SWIPE_TIME_THRESHOLD) {
        emitGesture(handName, deltaX > 0 ? 'swipe_right' : 'swipe_left', x, y, z);
        resetStore(store);
        return;
    }

    // Swipe vertical
    if (Math.abs(deltaY) > SWIPE_THRESHOLD && deltaTime < SWIPE_TIME_THRESHOLD) {
        emitGesture(handName, deltaY > 0 ? 'swipe_up' : 'swipe_down', x, y, z);
        resetStore(store);
        return;
    }

    // Push (Click hacia adelante)
    if (deltaZ > PUSH_THRESHOLD && deltaTime < SWIPE_TIME_THRESHOLD && z<1) {
        console.log(z)
        emitGesture(handName, 'click', x, y, z);
        resetStore(store);
        return;
    }

    // Reset si pasó el tiempo
    if (deltaTime > SWIPE_TIME_THRESHOLD) resetStore(store);
};

const resetStore = (store) => {
    store.startX = null;
    store.startY = null;
    store.startZ = null;
    store.startTime = null;
};

const emitGesture = (handName, type, x, y, z) => {
    const gestureData = {
        hand: handName === 'left' ? 'izq' : 'der',
        type,
        coordinates: { x, y, z },
        timestamp: Date.now()
    };
    console.log(`Gesto enviado: ${JSON.stringify(gestureData)}`);
    io.emit('gesture', gestureData);
};

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ID=${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ID=${socket.id}`);
    });
});

process.on('SIGINT', () => {
    console.log("Cerrando Kinect y servidor...");
    kinect.close();
    server.close();
    process.exit();
});