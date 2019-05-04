import { Response } from 'express';

export interface GatewayedResponse extends Response {
    delegate(name: string): Promise<any>;
}