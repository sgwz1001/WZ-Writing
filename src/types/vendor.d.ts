declare module 'write-excel-file' {
  interface Cell {
    value: string | number | boolean | Date
    type?: 'string' | 'number' | 'boolean' | 'date'
  }

  interface Options {
    fileName?: string
    sheet?: string
  }

  export default function writeXlsxFile(
    data: Cell[][],
    options?: Options,
  ): Promise<Blob>
}
