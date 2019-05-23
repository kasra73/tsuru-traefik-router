import * as Router from 'koa-router';

const router = new Router();

// Manage Backends
router.get('/backend/:name', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = { address: `${name}.example.com` };
});
router.delete('/backend/:name', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = { address: `${name}.example.com` };
});
router.post('/backend/:name', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = { address: `${name}.example.com` };
});
// Manage Backend Routes
router.get('/backend/:name/routes', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.post('/backend/:name/routes', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.post('/backend/:name/routes/remove', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.post('/backend/:name/swap', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});

// Manage Certificates
router.get('/backend/:name/certificate/:certname', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.put('/backend/:name/certificate/:certname', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.delete('/backend/:name/certificate/:certname', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});

// Manage CNames
router.get('/backend/:name/cname/:cname', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.put('/backend/:name/cname/:cname', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});
router.delete('/backend/:name/cname/:cname', async (ctx) => {
    let name = ctx.params.name;
    ctx.body = [ { addresses: [ `${name}.example.com` ] } ];
});

router.get('/healthcheck', async (ctx) => {
    ctx.body = "OK";
});
router.get('/info', async (ctx) => {
    ctx.body = {
        "name": "Traefik Router",
        "description": "And implementation of Traefik router for tsuru paas, in koa.",
    };
});

// Check Supported Routes
router.get('/support/tls', async (ctx) => {
    ctx.body = "Yes";
});
router.get('/support/cname', async (ctx) => {
    ctx.body = "Yes";
});
router.get('/support/info', async (ctx) => {
    ctx.status = 200;
    ctx.body = "Yes";
});


export const routes = router.routes();
