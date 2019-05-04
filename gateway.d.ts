import {
    Express,
    Request,
    Response,
    NextFunction,
    IRouterHandler,
    IRouterMatcher,
    RequestHandler,
    ErrorRequestHandler,
        } from 'express';

type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

export declare class Gateway {
    public constructor (optionns: {
        microservices: Array<string>,
        rabbit?: {
            url: string,
        },
        requests?: {
            timeout: number,
        },
    });

    public action(name: string|Array<string>, handler: (mate: any, res: Response) => void|Response): void;
    public action(name: string|Array<string>, handler: Function): void;

    public enablePrometheus(
        endpoint?: string,
        credentials?: {
            user: string,
            password: string,
        },
    ): void;
    public enablePrometheus(
        credentials: {
            user: string,
            password: string,
        },
    ): void;

    public middleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;

    public use: ApplicationRequestHandler<this>;

    public all: IRouterMatcher<this>;
    public get: IRouterMatcher<this>;
    public post: IRouterMatcher<this>;
    public put: IRouterMatcher<this>;
    public delete: IRouterMatcher<this>;
    public patch: IRouterMatcher<this>;
    public options: IRouterMatcher<this>;

    public listen(port: number): Promise<void>;
}



export interface GatewayedResponse extends Response {
    delegate(name: string): Promise<any>;
}