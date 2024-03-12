import uWs from "uWebSockets.js";

const app = uWs.App();
const port = 8080;
const topics = {
  zoneGateAuto: "zone/gate/auto",
  zoneGateFixed: "zone/gate/fixed",
  zoneGateEcho: "zone/gate/echo"
};
let broadcastFixedTimeMs = 1_000;

function getRandomNumber(min: number, max: number, skipList: number[] = []): number {
  const value = Math.floor(Math.random() * (max - min + 1)) + min;

  if (skipList.includes(value)) return getRandomNumber(min, max, skipList);
  return value;
}

function getRandomNumbers(quantity: number, min: number, max: number): number[] {
  const values: number[] = [];
  const maxQuantity = max - (min - 1);

  if (quantity < 1) quantity = 1;
  if (quantity > maxQuantity) quantity = maxQuantity;

  for (let index = 0; index < quantity; index++) {
    values.push(getRandomNumber(min, max, values));
  }

  return values;
}

function formatData(numbers: number[]): string {
  return numbers.sort((a, b) => a - b).join(",").toString();
}

function queryStringToJson(queryString: string): Record<string, string> {
  let searchParams = new URLSearchParams(queryString);
  let json: Record<string, string> = {};

  for (let [key, value] of searchParams) {
    json[key] = value;
  }

  return json;
}

function broadcastingAuto(): void {
  let nexTimeMs = Date.now() + getRandomNumber(500, 10_000);

  setInterval(() => {
    if (Date.now() >= nexTimeMs) {
      app.publish(topics.zoneGateAuto, formatData(getRandomNumbers(getRandomNumber(1, 4), 1, 4)));

      nexTimeMs = Date.now() + getRandomNumber(500, 10_000);
    }
  }, 100);
}

function broadcastingFixed(): void {
  let nexTimeMs = Date.now() + broadcastFixedTimeMs;

  setInterval(() => {
    if (Date.now() >= nexTimeMs) {
      app.publish(topics.zoneGateFixed, formatData(getRandomNumbers(getRandomNumber(1, 4), 1, 4)));

      nexTimeMs = Date.now() + broadcastFixedTimeMs;
    }
  }, 100);
}

app.ws("/zone-gate-auto", {
  compression: uWs.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 10,
  open: (ws) => {
    ws.send("ok");
    ws.subscribe("zone/gate/auto");
  }
});

app.ws("/zone-gate-fixed", {
  compression: uWs.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 10,
  open: (ws) => {
    ws.send("ok");
    ws.subscribe("zone/gate/fixed");
  }
});

app.ws("/zone-gate-echo", {
  compression: uWs.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 10,
  open: (ws) => {
    ws.send("ok");
  },
  message: (ws, message, isBinary) => {
    ws.send(message, isBinary);
  }
});

app.get("/set-fixed-time", (res, req) => {
  try {
    const queries = queryStringToJson(req.getQuery());
    const msQuery = queries["ms"] || "1_000";
    broadcastFixedTimeMs = parseInt(msQuery);

    res.end("ok");
  } catch (error: any) {
    console.error(error?.message ? error.message : error);
  }
});

app.any('/*', (res, req) => {
  res.end('Nothing to see here!');
});

app.listen(port, (token) => {
  if (token) {
    console.log('Listening to port ' + port);
    broadcastingAuto();
    broadcastingFixed();
  } else {
    console.log('Failed to listen to port ' + port);
  }
});
