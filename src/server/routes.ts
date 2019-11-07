import * as Consul from 'consul';
import * as crypto from 'crypto';
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
    return next();
};

// Manage Backends
router.get('/backend/:name', validateName, async (ctx) => {
    const name = ctx.params.name;
    try {
        const result = await consul.kv.keys('traefik/backends/' + name);
        // ctx.body = { result };
        ctx.body = { address: `${name}.${ROUTER_DOMAIN}` };
    } catch (err) {
        if (err.statusCode == 404) {
            ctx.status = 200;
            ctx.body = {};
            return;
        }
        ctx.status = 500;
        ctx.body = { err };
        console.log('error: ', err);
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
    consul.kv.set(MANAGER_KEYS_PREFIX + name + '/info', JSON.stringify((ctx.request as any).body));
    consul.kv.set('traefik/frontends/' + name + '/routes/main/rule', 'Host:' + appMainAddress);
    consul.kv.set('traefik/frontends/' + name + '/backend', name);
    ctx.body = { body: (ctx.request as any).body, name };
});
router.put('/backend/:name/healthcheck', validateName, async (ctx) => {
    const name = ctx.params.name;
    consul.kv.set('traefik/backends/' + name + '/healthcheck/path', (ctx.request as any).body.Path);
    ctx.body = { body: (ctx.request as any).body, name };
});
// Manage Backend Routes
router.get('/backend/:name/routes', async (ctx) => {
    const name = ctx.params.name;
    try {
        const objects = await consul.kv.get({ key: 'traefik/backends/' + name + '/servers', recurse: true });
        const array = (objects as any);
        const addresses: string[] = [];
        for (const obj of array) {
            addresses.push(obj.Value);
        }
        console.log({ addresses });
        ctx.body = [{ addresses }];
    } catch (err) {
        ctx.body = [{ addresses: [] }];
    }
});
router.post('/backend/:name/routes', async (ctx) => {
    const name = ctx.params.name;
    const addresses = (ctx.request as any).body.addresses;
    consul.kv.set(MANAGER_KEYS_PREFIX + name + '/routes', JSON.stringify(addresses));
    // consul.kv.del({ key: 'traefik/backends/' + name + '/servers', recurse: true }); // delete all routes
    for (const address of addresses) {
        const sha1Hasher = crypto.createHash('sha1');
        const hash = sha1Hasher.update(address).digest('hex');
        consul.kv.set('traefik/backends/' + name + '/servers/server' + hash + '/url', address);
    }
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
});
router.post('/backend/:name/routes/remove', async (ctx) => {
    const name = ctx.params.name;
    const addresses = (ctx.request as any).body.addresses;
    for (const address of addresses) {
        const sha1Hasher = crypto.createHash('sha1');
        const hash = sha1Hasher.update(address).digest('hex');
        consul.kv.del({ key: 'traefik/backends/' + name + '/servers/server' + hash, recurse: true });
    }
    ctx.body = [{ addresses }];
});
router.post('/backend/:name/swap', async (ctx) => {
    const name = ctx.params.name;
    ctx.status = 412;
    ctx.body = { message: 'swap not supported' };
});
router.get('/backend/:name/status', async (ctx) => {
    ctx.body = [{
        status: 'green',
        detail: 'Units are running',
    }];
});

// Manage Certificates
router.get('/backend/:name/certificate/:certname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
});
router.put('/backend/:name/certificate/:certname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
});
router.delete('/backend/:name/certificate/:certname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
});

// Manage CNames
router.get('/backend/:name/cname', async (ctx) => {
    const name = ctx.params.name;
    const prefix = MANAGER_KEYS_PREFIX + name + '/cnames/';
    let cnamesArray: string[];
    try {
        const cnames = await consul.kv.keys(prefix);
        cnamesArray = (cnames as string[]);
    } catch (err) {
        if (err.statusCode !== 404) {
            console.error(err);
        }
        cnamesArray = [];
    }
    for (let i = 0; i < cnamesArray.length; i++) {
        cnamesArray[i] = cnamesArray[i].replace(prefix, '');
    }
    ctx.status = 200;
    ctx.body = { cnames: cnamesArray };
});
router.get('/backend/:name/cname/:cname', async (ctx) => {
    const name = ctx.params.name;
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
});
router.post('/backend/:name/cname/:cname', async (ctx) => {
    const name = ctx.params.name;
    const cname = ctx.params.cname;
    consul.kv.set('traefik/frontends/' + cname + '/routes/' + cname + '/rule', 'Host:' + cname);
    consul.kv.set('traefik/frontends/' + cname + '/backend', name);
    consul.kv.set(MANAGER_KEYS_PREFIX + name + '/cnames/' + cname, '1');
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
});
router.delete('/backend/:name/cname/:cname', async (ctx) => {
    const name = ctx.params.name;
    const cname = ctx.params.cname;
    const cnameKey = await consul.kv.get(MANAGER_KEYS_PREFIX + name + '/cnames/' + cname);
    if (cnameKey) {
        consul.kv.del({ key: 'traefik/frontends/' + cname, recurse: true });
    }
    ctx.body = [{ addresses: [`${name}.${ROUTER_DOMAIN}`] }];
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
    ctx.status = 404;
    ctx.body = 'No';
});
router.get('/support/status', async (ctx) => {
    ctx.status = 404;
    ctx.body = 'No';
});
router.get('/support/cname', async (ctx) => {
    ctx.body = 'Yes';
});
router.get('/support/info', async (ctx) => {
    ctx.status = 200;
    ctx.body = 'Yes';
});

export const routes = router.routes();
