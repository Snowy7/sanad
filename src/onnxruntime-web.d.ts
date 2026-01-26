declare module 'onnxruntime-web' {
  export interface Tensor {
    data: Float32Array | Int32Array | Uint8Array | BigInt64Array | BigUint64Array
    dims: readonly number[]
    type: string
  }

  export class Tensor {
    constructor(
      type: 'float32' | 'int32' | 'uint8' | 'int64' | 'uint64' | 'bool' | 'string',
      data: Float32Array | Int32Array | Uint8Array | BigInt64Array | BigUint64Array | number[] | boolean[] | string[],
      dims?: readonly number[]
    )
    data: Float32Array | Int32Array | Uint8Array | BigInt64Array | BigUint64Array
    dims: readonly number[]
    type: string
  }

  export interface InferenceSession {
    inputNames: readonly string[]
    outputNames: readonly string[]
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>
  }

  export interface SessionOptions {
    executionProviders?: string[]
    graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all'
  }

  export namespace InferenceSession {
    function create(path: string, options?: SessionOptions): Promise<InferenceSession>
    function create(buffer: ArrayBuffer, options?: SessionOptions): Promise<InferenceSession>
  }

  export namespace env {
    namespace wasm {
      let wasmPaths: string
      let numThreads: number
    }
  }
}
