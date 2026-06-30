import { ComponentDef } from '../../model/component-def/component-def';

export class MappingComponentService {

  constructor() { }

  static resolveStyles(mappings: ComponentDef[]){
      const styleUrls: any [] = [];
      mappings.forEach(mapping => {
          styleUrls.push(mapping.styleUrl);
      });
      return (styleUrls);
  }
}
