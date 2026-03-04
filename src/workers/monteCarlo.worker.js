import { runMonteCarlo } from '../engine/calculator.js';

self.onmessage = function (e) {
  const result = runMonteCarlo(e.data.state);
  self.postMessage(result);
};
