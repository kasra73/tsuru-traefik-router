import * as Consul from 'consul';
import * as dotenv from 'dotenv';
import * as Router from 'koa-router';

dotenv.config();

const MANAGER_KEYS_PREFIX = process.env.MANAGER_KEYS_PREFIX;
const ROUTER_DOMAIN = process.env.ROUTER_DOMAIN;
const options = {
    host: process.env.CONSUL_HOST,
    port: process.env.CONSUL_PORT,
    secure: (process.env.CONSUL_SECURE == 'true'),
    promisify: true,
};
const consul = new Consul(options);
const router = new Router();

const validateName = (ctx: any, next: any) => {
    const name = ctx.params.name;
    if (!name.match(/^[a-z][a-z0-9-]+$/)) {
        ctx.status = 412;
        ctx.body = { result: 'error', message: 'Invalid backend name' };
        return;
    }
    next();
};

// Manage Backends
router.get('/backend/:name', validateName, async (ctx) => {
    const name = ctx.params.name;
    try {
        const result = await consul.kv.keys('traefik/backends/' + name);
        ctx.body = { result };
    } catch (err) {
        console.log('keys: ', err);
        ctx.status = 500;
        ctx.body = { err };
    }
});
router.delete('/backend/:name', validateName, async (ctx) => {
    const name = ctx.params.name;
    consul.kv.del({
        key: MANAGER_KEYS_PREFIX + name,
        recurse: true,
    });
    consul.kv.del({
        key: 'traefik/backends/' + name,
        recurse: true,
    });
    consul.kv.del({
        key: 'traefik/frontends/' + name,
        recurse: true,
    });
    ctx.body = { address: `${name}.${ROUTER_DOMAIN}` };
});
router.post('/backend/:name', validateName, async (ctx) => {
    const name = ctx.params.name;
    const appMainAddress = `${name}.${ROUTER_DOMAIN}`;
    consul.kv.set(MANAGER_KEYS_PREFIX + name + '/info', JSON.stringify(ctx.request.body));
    consul.kv.set('traefik/frontends/' + name + '/routes/main/rule', 'Host:' + appMainAddress);
    consul.kv.set('traefik/frontends/' + name + '/backend', name);
    ctx.body = { body: ctx.request.body, name };
});
// Manage Backend Routes
router.get('/backend/:name/routes', async (ctx) => {
    const name = ctx.params.name;
    const a = await consul.kv.get({ key: 'traefik/backends/' + name + '/servers', recurse: true });
    ctx.body = a;
    // ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.post('/backend/:name/routes', async (ctx) => {
    const name = ctx.params.name;
    const addresses = ctx.request.body.addresses;
    consul.kv.set(MANAGER_KEYS_PREFIX + name + '/routes', JSON.stringify(addresses));
    consul.kv.del({ key: 'traefik/backends/' + name + '/servers', recurse: true });
    for (let i = 0; i < addresses.length; i++ ) {
        consul.kv.set('traefik/backends/' + name + '/servers/server' + i + '/url', addresses[i]);
    }
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.post('/backend/:name/routes/remove', async (ctx) => {
    const name = ctx.params.name;
    const addresses = ctx.request.body.addresses;
    const aa = [];
    if (addresses.length > 0) {
        const result: any = await consul.kv.get({ key: 'traefik/backends/' + name + '/servers', recurse: true });
        for (const address of addresses) {
            for (const i in result) {
                if (result.hasOwnProperty(i) && result[i].Value == address) {
                    aa.push(address);
                    consul.kv.del({ key: result[i].Key, recurse: true });
                }
            }
        }
    }
    ctx.body = [ { addresses: aa } ];
});
router.post('/backend/:name/swap', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.get('/backend/:name/status', async (ctx) => {
    ctx.body = [{
        status: 'yellow',
        detail: '3/4 units are running',
    }];
});

// Manage Certificates
router.get('/backend/:name/certificate/:certname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.put('/backend/:name/certificate/:certname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.delete('/backend/:name/certificate/:certname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});

// Manage CNames
router.get('/backend/:name/cname/:cname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.put('/backend/:name/cname/:cname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});
router.delete('/backend/:name/cname/:cname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.${ROUTER_DOMAIN}` ] } ];
});

router.get('/healthcheck', async (ctx) => {
    ctx.body = 'OK';
});
router.get('/info', async (ctx) => {
    ctx.body = {
        name: 'Traefik Router',
        description: 'And implementation of Traefik router for tsuru paas, in koa.',
    };
});

// Check Supported Routes
router.get('/support/tls', async (ctx) => {
    ctx.body = 'Yes';
});
router.get('/support/cname', async (ctx) => {
    ctx.body = 'Yes';
});
router.get('/support/info', async (ctx) => {
    ctx.status = 200;
    ctx.body = 'Yes';
});

export const routes = router.routes();
