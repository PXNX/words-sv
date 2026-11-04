// onnxruntime-web ships its WebGPU build without type declarations; voxcpm.worker.ts types it as
// the main onnxruntime-web module, which has the same API.
declare module 'onnxruntime-web/webgpu';
