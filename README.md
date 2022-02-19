# centralized

[![build status](https://github.com/WebReflection/centralized/actions/workflows/node.js.yml/badge.svg)](https://github.com/WebReflection/centralized/actions) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/centralized/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/centralized?branch=main)

A module to delegate to the main thread tasks meant to run for all forked threads.

```js
import cluster from 'node:cluster';
import {cpus} from 'node:os';

import centralized from 'centralized';

const appHelper = centralized({
  // the init method executes once only in the main thread
  init() {
    // it can pollute its context with values
    this.connection = db.connect({user, pass, stuff});
  },
  // all methods can be used seamlessly from worker ot main
  query: async function(sql, ...values) {
    const stmt = this.connection.prepare(sql);
    return await stmt.exec(...values);
  }
});

if (cluster.isWorker) {
  // this will return the result from the db
  const result = await appHelper.query(
    'SELECT * FROM table WHERE thing = ?',
    'cool'
  );
  console.log(result);
}
else {
  // perform the query all over the place
  for (let {length} = cpus(), i = 0; i < length; i++)
    cluster.fork();
}
```

And that's all folks 🥳
