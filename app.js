const uWS = require('uWebSockets.js');
const port  =  9001


const handleMiddlewares = (middlewares) => {
    return async (res, req) => {
        // Enhance the res object
        const enhanceRes = (res) => {
            const originalEnd = res.end.bind(res);
            res.finished = false;

            res.end = (...args) => {
                if (!res.finished) {
                    originalEnd(...args);
                    res.finished = true;
                }
                return res;
            };
        };

        enhanceRes(res);

        res.onAborted(() => {
            res.aborted = true;
            res.finished = true;
        });

        // Middleware runner
        const runMiddlewares = async (res, req) => {
           
            const nextMiddleware = async (index) => {
                if (index >= middlewares.length || res.finished) return;

                const middleware = middlewares[index];
                const nextIndex = index + 1
                 const hasNext =  middlewares[nextIndex]

                if (middleware) {
                    await middleware(req, res);
                    if(hasNext) {
                        await nextMiddleware(nextIndex)
                    }

                     
                }
            };

            await nextMiddleware(0);
        };

        await runMiddlewares(req, res);
    };
};

const app = uWS.App()

module.exports  =  {app,  port, handleMiddlewares, uWS }