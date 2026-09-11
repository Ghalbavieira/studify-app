declare module "pdf-parse/lib/pdf-parse.js" {
  type TextItem = { str?: string } & Record<string, unknown>;
  type PageData = {
    getTextContent: () => Promise<{ items: TextItem[] }>;
  };
  type Options = {
    pagerender?: (pageData: PageData) => Promise<string>;
  };
  export default function pdf(data: Buffer, options?: Options): Promise<{ text: string; numpages?: number }>;
}
