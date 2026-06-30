export interface CrudModuleDefinition {
    path: string;
    loader: () => Promise<any>;
}
