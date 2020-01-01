import { IPAICluster } from '../models/cluster';
import { IStorage, IStorageConfig } from '../models/storage';
import { OpenPAIBaseClient } from './baseClient';
/**
 * OpenPAI Job client.
 */
export declare class StorageClient extends OpenPAIBaseClient {
    constructor(cluster: IPAICluster);
    /**
     * Get storage informations.
     * @param names Filter storage server with names, default name empty will be ignored.
     */
    get(names?: string, token?: string): Promise<IStorage[]>;
    /**
     * Get storage information.
     * @param storage The storage name.
     */
    getByName(storage: string, token?: string): Promise<IStorage>;
    /**
     * Get storage config.
     * @param names Filter storage server with names, default name empty will be ignored.
     */
    getConfig(names?: string, token?: string): Promise<IStorage[]>;
    /**
     * Get storage config.
     * @param storage The storage name.
     */
    getConfigByName(storage: string, token?: string): Promise<IStorageConfig>;
}
