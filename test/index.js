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
  process.exit(0);
}
