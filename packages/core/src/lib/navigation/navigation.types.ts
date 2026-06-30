import { FwkNavigationItem } from '../layout/infrastructure/components/navigation';

export interface Navigation
{
    compact: FwkNavigationItem[];
    default: FwkNavigationItem[];
    futuristic: FwkNavigationItem[];
    horizontal: FwkNavigationItem[];
}

export interface NavigationGroup extends FwkNavigationItem {
    id: string;
    title: string;
    type: 'group' | 'collapsable' | 'basic';
    icon?: string;
    children?: FwkNavigationItem[];
    order?: number;
}