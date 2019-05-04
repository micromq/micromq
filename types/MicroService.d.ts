import { Server } from 'http';
import {
    IRouterHandler,
    IRouterMatcher,
    RequestHandler,
    ErrorRequestHandler,
        } from 'express';

type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);


export declare class MicroMQ {
    public constructor (optionns: {
        name: string,
        microservices?: Array<string>,
        rabbit?: {
            url: string,
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

    public use: ApplicationRequestHandler<this>;

    public all: IRouterMatcher<this>;
    public get: IRouterMatcher<this>;
    public post: IRouterMatcher<this>;
    public put: IRouterMatcher<this>;
    public delete: IRouterMatcher<this>;
    public patch: IRouterMatcher<this>;
    public options: IRouterMatcher<this>;


    public ask(name: string, query: {
        path?: string,
        method?: 'get'|'post'|'put'|'delete'|'patch'|'options',
        query?: {[key: string]: string},
        params?: {[key: string]: string},
        body?: {[key: string]: string},
        server?: {
            action: string,
            [key: string]: any,
        },
    }): Promise<{ status: number, response: any}>;

    public listen(port: number): Server;

    public start(): Promise<void>;
}