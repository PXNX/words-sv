/// <reference lib="webworker" />
/*
 * VoxCPM2 (OpenBMB) text-to-speech in this worker, with ONNX Runtime Web on WebGPU. The graphs are
 * danyalmalik/VoxCPM2-ONNX-WebGPU (4-bit, ~1.6 GB); the generation loop below follows that model
 * card's "Generation (VoxCPM2Model._inference, no reference voice)" step by step:
 *
 *   1. ids = text tokens (no BOS) + [101]; at most min(6 × tokens + 10, 2000) patches.
 *   2. raw = base_lm(text_embed(ids)); lm_h, res_in, stop = bridge(raw, zeros, mask 0);
 *      res_h = residual_lm(res_in); keep the last rows; prev = zeros [1, 4, 64].
 *   3. Per patch: x ~ N(0, 1) [1, 64, 4]; 10 Euler steps of the local DiT on the schedule
 *      t = 2s + cos(πs/2) − 1 for s = linspace(1, 0, 11), skipping step 0 (CFG-zero*);
 *      patch = xᵀ. Stop after it when i > 2 and argmax(stop) == 1; otherwise feed it back through
 *      feat_encoder → base_lm → bridge (mask 1) → residual_lm, and prev = patch.
 *   4. All patches, as latents [1, 64, 4 × patches], through vae_decoder → 48 kHz audio.
 *
 * The model has no voice control; the noise is drawn from a generator seeded per character, which
 * keeps a character's voice steadier from line to line. Files are downloaded resumably and cached
 * (offline/resumableDownload.ts), so a dropped connection does not restart 1.6 GB.
 */
import * as ortWebgpu from 'onnxruntime-web/webgpu';
import type { InferenceSession, Tensor } from 'onnxruntime-common';
import { AutoTokenizer, type PreTrainedTokenizer } from '@huggingface/transformers';
import { resumableDownload } from '#lib/offline/resumableDownload.js';

// The WebGPU build, typed as the main package (same API).
const ort = ortWebgpu as typeof import('onnxruntime-common');

const REPO = 'danyalmalik/VoxCPM2-ONNX-WebGPU';
const BASE = `https://huggingface.co/${REPO}/resolve/main/onnx`;
const CACHE = 'voxcpm2-v1';
const GRAPHS = ['text_embed_q4', 'base_lm_q4', 'residual_lm_q4', 'bridge_q4', 'feat_encoder_q4', 'dit_step_q4', 'vae_decoder_q4c8'] as const;
type Graph = (typeof GRAPHS)[number];
const HIDDEN = 2048;
const FEAT = 64;
const PATCH = 4;
const AUDIO_START = 101;
const SAMPLE_RATE = 48_000;

export type VoxRequest =
  | { id: number; type: 'load' }
  | { id: number; type: 'speak'; text: string; seed: number };
export type VoxReply =
  | { id: number; type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'done'; pcm?: Float32Array; sampleRate?: number }
  | { id: number; type: 'error'; message: string };

type Model = { sessions: Record<Graph, InferenceSession>; tokenizer: PreTrainedTokenizer };
let model: Promise<Model> | null = null;
const post = (reply: VoxReply, transfer: Transferable[] = []) => self.postMessage(reply, transfer);

function load(id: number): Promise<Model> {
  model ??= (async () => {
    const tokenizer = await AutoTokenizer.from_pretrained(REPO);
    const sessions = {} as Record<Graph, InferenceSession>;
    // One progress bar over all graphs, weighted by their real size.
    const sizes = new Map<Graph, { loaded: number; total: number }>();
    const report = () => {
      let loaded = 0;
      let total = 0;
      for (const size of sizes.values()) { loaded += size.loaded; total += size.total; }
      post({ id, type: 'progress', loaded, total });
    };
    for (const graph of GRAPHS) {
      const bytes = await resumableDownload(`${BASE}/${graph}.onnx`, CACHE, (loaded, total) => {
        sizes.set(graph, { loaded, total });
        report();
      });
      sessions[graph] = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu', 'wasm'] });
    }
    return { sessions, tokenizer };
  })();
  model.catch(() => { model = null; });
  return model;
}

// --- small tensor helpers -------------------------------------------------------------------------

const f32 = (data: Float32Array, dims: number[]) => new ort.Tensor('float32', data, dims);
const zeros = (dims: number[]) => f32(new Float32Array(dims.reduce((a, b) => a * b, 1)), dims);

/** The last row of a [1, S, D] tensor, as [1, D]. */
function lastRow(tensor: Tensor): Tensor {
  const [, rows, width] = tensor.dims;
  const data = tensor.data as Float32Array;
  return f32(data.slice((rows - 1) * width, rows * width), [1, width]);
}

// Mulberry32: a tiny seeded generator, so a seed always draws the same noise.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(random: () => number, length: number) {
  const out = new Float32Array(length);
  for (let index = 0; index < length; index += 2) {
    const u = Math.max(random(), 1e-12);
    const v = random();
    const radius = Math.sqrt(-2 * Math.log(u));
    out[index] = radius * Math.cos(2 * Math.PI * v);
    if (index + 1 < length) out[index + 1] = radius * Math.sin(2 * Math.PI * v);
  }
  return out;
}

/** A language model with a key/value cache: every call continues from the positions before it. */
function cachedLm(session: InferenceSession) {
  const pastNames = session.inputNames.filter((name) => name.startsWith('past_key_values'));
  let past: Record<string, Tensor> = Object.fromEntries(pastNames.map((name: string) => [name, zeros([1, 2, 0, 128])]));
  return async (inputsEmbeds: Tensor): Promise<Tensor> => {
    const outputs = await session.run({ inputs_embeds: inputsEmbeds, ...past });
    const next: Record<string, Tensor> = {};
    for (const name of session.outputNames) {
      if (name.startsWith('present')) next[name.replace(/^present/, 'past_key_values')] = outputs[name];
    }
    past = next;
    return outputs.hidden;
  };
}

// t = 2s + cos(πs/2) − 1 for s = linspace(1, 0, 11).
const SCHEDULE = Array.from({ length: 11 }, (_, index) => {
  const s = 1 - index / 10;
  return s + (Math.cos((Math.PI * s) / 2) - 1 + s);
});

async function speak(text: string, seed: number, id: number): Promise<Float32Array> {
  const { sessions, tokenizer } = await load(id);
  const tokens = tokenizer.encode(text, { add_special_tokens: false });
  const ids = [...tokens, AUDIO_START];
  const maxPatches = Math.min(6 * tokens.length + 10, 2000);
  const baseLm = cachedLm(sessions.base_lm_q4);
  const residualLm = cachedLm(sessions.residual_lm_q4);
  const random = seeded(seed);

  // 2. The text, through both language models.
  const { embeds } = await sessions.text_embed_q4.run({ ids: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]) });
  let raw = await baseLm(embeds);
  let bridged = await sessions.bridge_q4.run({ hidden: raw, feat_embed: zeros([1, ids.length, HIDDEN]), audio_mask: zeros([1, ids.length]) });
  let lmHidden = lastRow(bridged.lm_hidden);
  let resHidden = lastRow(await residualLm(bridged.residual_input));
  let stopLogits = bridged.stop_logits;
  let prev = zeros([1, PATCH, FEAT]);

  // 3. One patch of four latent frames at a time.
  const columns: Float32Array[] = [];
  for (let index = 0; index < maxPatches; index += 1) {
    let x = gaussian(random, FEAT * PATCH);
    for (let step = 1; step <= 9; step += 1) {
      const { v } = await sessions.dit_step_q4.run({
        x: f32(x, [1, FEAT, PATCH]), lm_hidden: lmHidden, residual_hidden: resHidden, cond: prev,
        t: f32(new Float32Array([SCHEDULE[step]]), [1]), cfg_value: f32(new Float32Array([2]), [])
      });
      const velocity = v.data as Float32Array;
      const dt = SCHEDULE[step] - SCHEDULE[step + 1];
      x = x.map((value, at) => value - dt * velocity[at]);
    }
    columns.push(x);
    // patch = xᵀ: [64, 4] → [4, 64].
    const patch = new Float32Array(PATCH * FEAT);
    for (let feature = 0; feature < FEAT; feature += 1) for (let frame = 0; frame < PATCH; frame += 1) patch[frame * FEAT + feature] = x[feature * PATCH + frame];
    const stop = (stopLogits.data as Float32Array).slice(-2);
    if (index > 2 && stop[1] > stop[0]) break;
    const patchTensor = f32(patch, [1, PATCH, FEAT]);
    const { embeds: featEmbed } = await sessions.feat_encoder_q4.run({ feats: f32(patch, [1, 1, PATCH, FEAT]) });
    raw = await baseLm(featEmbed);
    bridged = await sessions.bridge_q4.run({ hidden: raw, feat_embed: featEmbed, audio_mask: f32(new Float32Array([1]), [1, 1]) });
    lmHidden = lastRow(bridged.lm_hidden);
    resHidden = lastRow(await residualLm(bridged.residual_input));
    stopLogits = bridged.stop_logits;
    prev = patchTensor;
  }

  // 4. Latents [1, 64, 4 × patches] through the VAE.
  const frames = columns.length * PATCH;
  const latents = new Float32Array(FEAT * frames);
  columns.forEach((x, patchIndex) => {
    for (let feature = 0; feature < FEAT; feature += 1) for (let frame = 0; frame < PATCH; frame += 1) latents[feature * frames + patchIndex * PATCH + frame] = x[feature * PATCH + frame];
  });
  const { audio } = await sessions.vae_decoder_q4c8.run({ latents: f32(latents, [1, FEAT, frames]) });
  return (audio.data as Float32Array).slice();
}

self.onmessage = async ({ data }: MessageEvent<VoxRequest>) => {
  try {
    if (data.type === 'load') {
      await load(data.id);
      post({ id: data.id, type: 'done' });
      return;
    }
    const pcm = await speak(data.text, data.seed, data.id);
    post({ id: data.id, type: 'done', pcm, sampleRate: SAMPLE_RATE }, [pcm.buffer]);
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
