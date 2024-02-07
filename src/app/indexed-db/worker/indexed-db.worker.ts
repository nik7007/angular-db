/// <reference lib="webworker" />

import {onRequest} from "../indexed-db.util";
import {BaseTableType, DbRequest} from "../indexed-db.model";

addEventListener('message', async (event: MessageEvent<DbRequest<BaseTableType>>) => {
  const {data} = event;
  try {
    await onRequest(data);

    postMessage('All done!');
  } catch (e) {
    postMessage('Errors!');
  }

});

