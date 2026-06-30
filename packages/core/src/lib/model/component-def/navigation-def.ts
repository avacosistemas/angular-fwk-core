export class NavigationDef {
    id!: string;
    translateKey!: string;
    url!: string;
    title?: string;
    
    permission?: string;
    translate?: string;
    showMenu?: boolean;
    icon?: string;
    group?: string; 
    showInMenu?: boolean;
    order?: number;
    activeItemId?: string;
}