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
