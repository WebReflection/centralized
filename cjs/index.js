'use strict';
/*! (c) Andrea Giammarchi - ISC */

const cluster = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('node:cluster'));
const isPrimary = !cluster.isWorker;

const {prototype: noArgs} = Array;
const {random} = Math;
const {defineProperty, getOwnPropertyDescriptor} = Object;
const {hasOwnProperty} = Object.prototype;
const {ownKeys, apply} = Reflect;

module.exports = definition => {
  let uid = 0;
  let init = false;
  const bridge = {};
  const base = random();
  for (const key of ownKeys(definition)) {
    if (key === 'init')
      init = isPrimary;
    else {
      const descriptor = getOwnPropertyDescriptor(definition, key);
      if (
        apply(hasOwnProperty, descriptor, ['value']) &&
        typeof descriptor.value === 'function'
      ) {
        const {value} = descriptor;
        descriptor.value = async function(...args) {
          if (isPrimary)
            return apply(value, this, args);
          else {
            const t = base + uid++;
            return new Promise((resolve, reject) => {
              process
                .on('message', function answer({t:uid, result, error}) {
                  if (t === uid) {
                    process.removeListener('message', answer);
                    if (error)
                      reject(new Error(error));
                    else
                      resolve(result);
                  }
                })
                .send({t, key, args});
            });
          }
        };
      }
      defineProperty(bridge, key, descriptor);
    }
  }

  if (isPrimary) {
    cluster.on('fork', worker => {
      worker.on('message', async ({t, key, args}) => {
        try {
          const result = await apply(bridge[key], bridge, args);
          worker.send({t, result, error: null});
        }
        catch ({message: error}) {
          worker.send({t, result: null, error});
        }
      });
    });
  }

  if (init)
    apply(definition.init, bridge, noArgs);

  return bridge;
};
