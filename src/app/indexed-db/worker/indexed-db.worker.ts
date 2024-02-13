/// <reference lib="webworker" />

import {onRequest} from "../indexed-db.util";
import {BaseTableType, DbErrorResponse, DbRequest} from "../indexed-db.model";

addEventListener('message', async (event?: MessageEvent<DbRequest<BaseTableType>>) => {
  if (!event) {
    postMessage({table: '', action: 'error', message: 'Empty event!'});
    return;
  }
  const {data} = event;
  try {
    const response = await onRequest(data);

    postMessage(response);
  } catch (e) {
    console.log(e);
    const resError: DbErrorResponse = {table: data.table, action: 'error', message: `${e}`}
    postMessage(resError);
  }
});

