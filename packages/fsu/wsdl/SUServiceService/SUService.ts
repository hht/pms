/* tslint:disable:max-line-length no-empty-interface */
export interface IinvokeInput {
    /** soapenc:string(undefined) */
    xmlData: string;
}

export interface IinvokeOutput {
    /** soapenc:string(undefined) */
    invokeReturn: string;
}

export interface ISUServiceSoap {
    invoke: (input: IinvokeInput, cb: (err: any | null, result: IinvokeOutput, raw: string,  soapHeader: {[k: string]: any; }) => any, options?: any, extraHeaders?: any) => void;
}
