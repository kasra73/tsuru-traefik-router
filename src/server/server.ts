import * as Koa from 'koa';
import * as koaBody from 'koa-body';

import { config } from './config';
import { logger } from './logging';
import { routes } from './routes';

const app = new Koa();

app.use(koaBody());
app.use(logger);
app.use(routes);

app.listen(config.port);

console.log(`Server running on port ${config.port}`);
