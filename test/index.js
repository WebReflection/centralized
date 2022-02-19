import cluster from 'node:cluster';
import {cpus} from 'node:os';
import centralized from '../esm/index.js';

const args = [];
const nmsp = centralized({
  c: 0,
  init() {
    this.c = 3;
  },
  sum(a, b) {
    args.push(a, b);
    return a + b + this.c;
  },
  fail() {
    throw new Error('epic');
  },
  wait(ms) {
    return new Promise($ => setTimeout($, ms, ms));
  }
});

if (cluster.isPrimary || cluster.isMaster) {
  // 1 + 2 + 3
  console.assert(await nmsp.sum(1, 2) === 6);
  console.assert(args.join(',') === '1,2');
  try {
    await nmsp.fail();
    console.assert('nope' === '');
  }
  catch ({message}) {
    console.assert('epic' === message);
  }
  for (let {length} = cpus(), i = 0; i < length; i++)
    cluster.fork();
}
else {
  try {
    await nmsp.fail();
    console.assert('nope' === '');
  }
  catch ({message}) {
    console.assert('epic' === message);
  }
  // 4 + 5 + 3
  console.assert(await nmsp.sum(4, 5) === 12);

  const race = [
    nmsp.wait(250),
    nmsp.wait(110),
    nmsp.wait(25),
    nmsp.wait(75)
  ];

  const winner = await Promise.race(race);
  console.assert(winner === 25);

  // wait for all promises to fulfill to avoid errors after exit
  await Promise.allSettled(race);
  process.exit(0);
}
