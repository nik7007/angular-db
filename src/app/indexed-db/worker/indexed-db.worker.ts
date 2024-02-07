/// <reference lib="webworker" />

import {onRequest} from "../indexed-db.util";
import type {BaseTableType, DbRequest} from "../indexed-db.model";

addEventListener('message', async (event?: MessageEvent<DbRequest<BaseTableType>>) => {
  if (!event) {
    postMessage('');
    return;
  }
  const {data} = event;
  try {
    await onRequest(data);

    postMessage('All done!');
  } catch (e) {
    postMessage('Errors!');
  }
});

