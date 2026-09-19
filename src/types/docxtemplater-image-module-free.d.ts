declare module 'docxtemplater-image-module-free' {
  interface ImageModuleOptions {
    centered?: boolean;
    fileType?: string;
    getImage: (tagValue: any) => any;
    getSize: (img: any, tagValue: any, tagName: string) => number[];
  }

  class ImageModule {
    constructor(options: ImageModuleOptions);
  }

  export = ImageModule;
}
