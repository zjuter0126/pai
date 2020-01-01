/**
 * OpenPAI storage information.
 */
export interface IStorage {
    spn: string;
    type: "nfs" | "samba" | "azurefile" | "azureblob";
    data: {
        [prop: string]: string;
    };
    extension: any;
}
export interface IStorageConfig {
    name: string;
    gpn?: string;
    default: boolean;
    servers?: string[];
    mountInfos: IMountInfo[];
}
export interface IMountInfo {
    mountPoint: string;
    server: string;
    path: string;
    permission?: string;
}
